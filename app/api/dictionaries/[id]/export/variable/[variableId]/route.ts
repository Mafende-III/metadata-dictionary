import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/middleware/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; variableId: string }> }
) {
  try {
    const params = await context.params;
    const { id: dictionaryId, variableId } = params;
    const { searchParams } = new URL(request.url);
    
    const format = searchParams.get('format') || 'json';
    const period = searchParams.get('period') || 'THIS_YEAR';
    const orgUnit = searchParams.get('orgUnit') || 'USER_ORGUNIT';
    const includeCurl = searchParams.get('includeCurl') === 'true';

    console.log(`🔍 Exporting variable ${variableId} data in ${format} format`);

    // Get variable metadata
    const variable = await getVariableMetadata(dictionaryId, variableId);
    if (!variable) {
      return NextResponse.json({
        success: false,
        error: 'Variable not found'
      }, { status: 404 });
    }

    // Get authenticated session for DHIS2 API calls
    const session = await getAuthenticatedSession(request);
    if (!session) {
      console.warn('⚠️ No authenticated session, using mock data');
    }

    // Fetch variable data
    const variableData = await fetchVariableData(session, variable, period, orgUnit);
    
    // Generate export data based on format
    const exportData = await generateExportData(variable, variableData, format, {
      period,
      orgUnit,
      includeCurl,
      session
    });

    console.log(`✅ Variable ${variableId} exported successfully in ${format} format`);

    return NextResponse.json({
      success: true,
      data: exportData,
      metadata: {
        variable: variable,
        format: format,
        period: period,
        orgUnit: orgUnit,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error exporting variable data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export variable data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get variable metadata
async function getVariableMetadata(dictionaryId: string, variableId: string) {
  if (!supabase) {
    // Return mock variable metadata
    return {
      id: 'mock-var',
      variable_uid: variableId,
      variable_name: `Mock Variable ${variableId}`,
      variable_type: 'dataElements',
      analytics_url: `/api/analytics?dimension=dx:${variableId}&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT`,
      api_url: `/api/dataElements/${variableId}.json`,
      metadata_json: {
        description: `Mock description for ${variableId}`,
        valueType: 'INTEGER',
        aggregationType: 'SUM'
      }
    };
  }

  try {
    const { data, error } = await supabase
      .from('dictionary_variables')
      .select('*')
      .eq('dictionary_id', dictionaryId)
      .eq('variable_uid', variableId)
      .single();

    if (error) {
      console.error('Error fetching variable metadata:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getVariableMetadata:', error);
    return null;
  }
}

// Fetch variable data from DHIS2 or cache
async function fetchVariableData(session: any, variable: any, period: string, orgUnit: string) {
  if (!session) {
    // Return mock data
    return generateMockVariableData(variable.variable_uid, period, orgUnit);
  }

  try {
    // Try to get analytics data
    const analyticsUrl = `${session.serverUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:${period}&dimension=ou:${orgUnit}&displayProperty=NAME&outputFormat=JSON`;
    
    const analyticsResponse = await fetch(analyticsUrl, {
      headers: {
        'Authorization': session.authHeader,
        'Content-Type': 'application/json'
      }
    });

    let analyticsData = null;
    if (analyticsResponse.ok) {
      analyticsData = await analyticsResponse.json();
    }

    // Get metadata
    const metadataUrl = `${session.serverUrl}/${variable.variable_type}/${variable.variable_uid}.json?fields=:all`;
    
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': session.authHeader,
        'Content-Type': 'application/json'
      }
    });

    let metadata = variable.metadata_json;
    if (metadataResponse.ok) {
      metadata = await metadataResponse.json();
    }

    return {
      analytics: analyticsData,
      metadata: metadata,
      variable: variable
    };

  } catch (error) {
    console.error('Error fetching variable data from DHIS2:', error);
    return generateMockVariableData(variable.variable_uid, period, orgUnit);
  }
}

// Generate export data in different formats
async function generateExportData(variable: any, data: any, format: string, options: any) {
  const baseExport = {
    variable: {
      uid: variable.variable_uid,
      name: variable.variable_name,
      type: variable.variable_type,
      description: data.metadata?.description || variable.metadata_json?.description,
      qualityScore: variable.quality_score
    },
    // Complete previewed table structure
    complete_table_row: variable.metadata_json || {},
    table_structure: {
      source: 'sql_view_preview',
      dynamic_structure: true,
      original_columns: variable.metadata_json ? Object.keys(variable.metadata_json) : []
    },
    analytics: data.analytics,
    metadata: data.metadata,
    enhanced_api_endpoints: {
      analytics: variable.analytics_api,
      metadata: variable.metadata_api,
      data_values: variable.data_values_api,
      export: variable.export_api,
      web_ui: variable.web_ui_url
    },
    exportInfo: {
      period: options.period,
      orgUnit: options.orgUnit,
      exportedAt: new Date().toISOString(),
      format: format,
      includes_complete_table: true,
      source: 'dynamic_table_structure'
    }
  };

  // Add curl command if requested
  if (options.includeCurl && options.session) {
    baseExport.curlCommand = generateCurlCommand(variable, options.session, options.period, options.orgUnit);
  }

  switch (format) {
    case 'json':
      return baseExport;
    
    case 'csv':
      return convertToCSV(baseExport);
    
    case 'xml':
      return convertToXML(baseExport);
    
    case 'summary':
      return generateSummaryReport(baseExport);
    
    default:
      return baseExport;
  }
}

// Generate curl command for the variable
function generateCurlCommand(variable: any, session: any, period: string, orgUnit: string) {
  const baseUrl = session.serverUrl;
  const analyticsUrl = `${baseUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:${period}&dimension=ou:${orgUnit}`;
  
  return {
    analytics: `curl -X GET "${analyticsUrl}" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`,
    
    metadata: `curl -X GET "${baseUrl}/${variable.variable_type}/${variable.variable_uid}.json?fields=:all" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`,
    
    note: "Replace 'username:password' with your actual DHIS2 credentials"
  };
}

// Convert to CSV format with complete table structure
function convertToCSV(data: any): string {
  const analytics = data.analytics;
  const completeTableRow = data.complete_table_row || {};
  const originalColumns = data.table_structure?.original_columns || [];

  // Create header with original table columns plus API info
  const csvHeaders = [
    'Variable_UID',
    'Variable_Name', 
    'Type',
    'Quality_Score',
    ...originalColumns,
    'Data_Values_API',
    'Analytics_API',
    'Period',
    'OrgUnit',
    'Value'
  ];

  let csv = csvHeaders.join(',') + '\n';

  if (!analytics || !analytics.rows || analytics.rows.length === 0) {
    // Single row with complete table data but no analytics
    const csvValues = [
      data.variable.uid,
      `"${data.variable.name}"`,
      data.variable.type || 'unknown',
      data.variable.qualityScore || 0,
      ...originalColumns.map(col => `"${String(completeTableRow[col] || '')}"`),
      `"${data.enhanced_api_endpoints?.data_values || ''}"`,
      `"${data.enhanced_api_endpoints?.analytics || ''}"`,
      'No Data',
      'No Data', 
      'No Data'
    ];
    csv += csvValues.join(',') + '\n';
  } else {
    // Multiple rows with analytics data
    analytics.rows.forEach((row: any[]) => {
      const csvValues = [
        data.variable.uid,
        `"${data.variable.name}"`,
        data.variable.type || 'unknown',
        data.variable.qualityScore || 0,
        ...originalColumns.map(col => `"${String(completeTableRow[col] || '')}"`),
        `"${data.enhanced_api_endpoints?.data_values || ''}"`,
        `"${data.enhanced_api_endpoints?.analytics || ''}"`,
        row[1] || 'Unknown',
        row[2] || 'Unknown',
        row[3] || '0'
      ];
      csv += csvValues.join(',') + '\n';
    });
  }

  return csv;
}

// Convert to XML format
function convertToXML(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<variableExport>
  <variable>
    <uid>${data.variable.uid}</uid>
    <name><![CDATA[${data.variable.name}]]></name>
    <type>${data.variable.type}</type>
    <qualityScore>${data.variable.qualityScore}</qualityScore>
  </variable>
  <exportInfo>
    <period>${data.exportInfo.period}</period>
    <orgUnit>${data.exportInfo.orgUnit}</orgUnit>
    <exportedAt>${data.exportInfo.exportedAt}</exportedAt>
  </exportInfo>
  <analytics>
    ${data.analytics ? `<rows>${data.analytics.rows?.map((row: any[]) => 
      `<row><dx>${row[0]}</dx><pe>${row[1]}</pe><ou>${row[2]}</ou><value>${row[3]}</value></row>`
    ).join('')}</rows>` : '<rows></rows>'}
  </analytics>
</variableExport>`;
}

// Generate summary report
function generateSummaryReport(data: any) {
  const analytics = data.analytics;
  let summary = {
    variable: data.variable,
    period: data.exportInfo.period,
    orgUnit: data.exportInfo.orgUnit,
    dataPoints: analytics?.rows?.length || 0,
    totalValue: 0,
    averageValue: 0,
    minValue: null,
    maxValue: null,
    lastUpdated: data.exportInfo.exportedAt
  };

  if (analytics?.rows && analytics.rows.length > 0) {
    const values = analytics.rows.map((row: any[]) => parseFloat(row[3])).filter((val: number) => !isNaN(val));
    
    if (values.length > 0) {
      summary.totalValue = values.reduce((sum: number, val: number) => sum + val, 0);
      summary.averageValue = summary.totalValue / values.length;
      summary.minValue = Math.min(...values);
      summary.maxValue = Math.max(...values);
    }
  }

  return summary;
}

// Generate mock variable data
function generateMockVariableData(variableId: string, period: string, orgUnit: string) {
  return {
    analytics: {
      headers: [
        { name: 'dx', column: 'Data' },
        { name: 'pe', column: 'Period' },
        { name: 'ou', column: 'Organisation unit' },
        { name: 'value', column: 'Value' }
      ],
      rows: [
        [variableId, period, orgUnit, Math.floor(Math.random() * 1000 + 100).toString()]
      ],
      height: 1,
      width: 4
    },
    metadata: {
      description: `Mock description for ${variableId}`,
      valueType: 'INTEGER',
      aggregationType: 'SUM'
    },
    variable: {
      uid: variableId,
      name: `Mock Variable ${variableId}`
    }
  };
} 