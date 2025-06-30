import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/middleware/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: dictionaryId } = params;
    const body = await request.json();
    
    const { variables, format = 'json', period = 'THIS_YEAR', orgUnit = 'USER_ORGUNIT' } = body;

    if (!variables || !Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Variables array is required'
      }, { status: 400 });
    }

    console.log(`🔍 Exporting ${variables.length} variables in ${format} format from dictionary ${dictionaryId}`);

    // Get authenticated session
    const session = await getAuthenticatedSession(request);
    if (!session) {
      console.warn('⚠️ No authenticated session, using mock data');
    }

    // Get dictionary metadata
    const dictionary = await getDictionaryMetadata(dictionaryId);
    
    // Fetch all variables data
    const variablesData = await fetchMultipleVariablesData(dictionaryId, variables, session, period, orgUnit);
    
    // Generate combined export
    const exportData = await generateCombinedExport(dictionary, variablesData, format, {
      period,
      orgUnit,
      session,
      requestedVariables: variables
    });

    console.log(`✅ Combined export completed successfully for ${variables.length} variables`);

    return NextResponse.json({
      success: true,
      data: exportData,
      metadata: {
        dictionary: dictionary,
        variableCount: variables.length,
        format: format,
        period: period,
        orgUnit: orgUnit,
        exportedAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error in combined export:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export combined data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get dictionary metadata
async function getDictionaryMetadata(dictionaryId: string) {
  if (!supabase) {
    return {
      id: dictionaryId,
      name: 'Mock Dictionary',
      description: 'Mock dictionary for development',
      instance_name: 'Mock Instance'
    };
  }

  try {
    const { data, error } = await supabase
      .from('metadata_dictionaries')
      .select('id, name, description, instance_name, metadata_type, period, version')
      .eq('id', dictionaryId)
      .single();

    if (error) {
      console.error('Error fetching dictionary metadata:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDictionaryMetadata:', error);
    return null;
  }
}

// Fetch data for multiple variables
async function fetchMultipleVariablesData(dictionaryId: string, variableUids: string[], session: any, period: string, orgUnit: string) {
  // Get variables metadata from database
  const variablesMetadata = await getVariablesMetadata(dictionaryId, variableUids);
  
  // Fetch analytics data for each variable
  const variablesWithData = await Promise.all(
    variablesMetadata.map(async (variable) => {
      try {
        const analyticsData = await fetchVariableAnalytics(session, variable, period, orgUnit);
        const metadataData = await fetchVariableMetadata(session, variable);
        
        return {
          ...variable,
          analytics: analyticsData,
          detailedMetadata: metadataData
        };
      } catch (error) {
        console.error(`Error fetching data for variable ${variable.variable_uid}:`, error);
        return {
          ...variable,
          analytics: null,
          detailedMetadata: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );

  return variablesWithData;
}

// Get variables metadata from database
async function getVariablesMetadata(dictionaryId: string, variableUids: string[]) {
  if (!supabase) {
    // Return mock variables
    return variableUids.map(uid => ({
      id: `mock-${uid}`,
      variable_uid: uid,
      variable_name: `Mock Variable ${uid}`,
      variable_type: 'dataElements',
      quality_score: Math.floor(Math.random() * 30 + 70),
      analytics_url: `/api/analytics?dimension=dx:${uid}`,
      api_url: `/api/dataElements/${uid}.json`
    }));
  }

  try {
    const { data, error } = await supabase
      .from('dictionary_variables')
      .select('*')
      .eq('dictionary_id', dictionaryId)
      .in('variable_uid', variableUids);

    if (error) {
      console.error('Error fetching variables metadata:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getVariablesMetadata:', error);
    return [];
  }
}

// Fetch analytics data for a variable
async function fetchVariableAnalytics(session: any, variable: any, period: string, orgUnit: string) {
  if (!session) {
    return generateMockAnalytics(variable.variable_uid, period, orgUnit);
  }

  try {
    const analyticsUrl = `${session.serverUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:${period}&dimension=ou:${orgUnit}&displayProperty=NAME&outputFormat=JSON`;
    
    const response = await fetch(analyticsUrl, {
      headers: {
        'Authorization': session.authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching analytics for ${variable.variable_uid}:`, error);
    return generateMockAnalytics(variable.variable_uid, period, orgUnit);
  }
}

// Fetch detailed metadata for a variable
async function fetchVariableMetadata(session: any, variable: any) {
  if (!session) {
    return {
      description: `Mock description for ${variable.variable_name}`,
      valueType: 'INTEGER',
      aggregationType: 'SUM'
    };
  }

  try {
    const metadataUrl = `${session.serverUrl}/${variable.variable_type}/${variable.variable_uid}.json?fields=:all`;
    
    const response = await fetch(metadataUrl, {
      headers: {
        'Authorization': session.authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Metadata API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching metadata for ${variable.variable_uid}:`, error);
    return variable.metadata_json || {};
  }
}

// Generate combined export in different formats
async function generateCombinedExport(dictionary: any, variablesData: any[], format: string, options: any) {
  // Get dynamic columns from first variable or dictionary
  const sampleVariable = variablesData[0];
  const dynamicColumns = sampleVariable?.metadata_json ? Object.keys(sampleVariable.metadata_json) : [];
  const detectedColumns = dictionary?.data?.detected_columns || dynamicColumns;

  const baseExport = {
    dictionary: {
      id: dictionary?.id,
      name: dictionary?.name || 'Unknown Dictionary',
      description: dictionary?.description,
      instance: dictionary?.instance_name,
      period: options.period,
      orgUnit: options.orgUnit,
      table_structure: {
        source: 'sql_view_preview',
        detected_columns: detectedColumns,
        dynamic_structure: true
      }
    },
    variables: variablesData.map(variable => ({
      uid: variable.variable_uid,
      name: variable.variable_name,
      type: variable.variable_type,
      qualityScore: variable.quality_score,
      analytics: variable.analytics,
      metadata: variable.detailedMetadata,
      error: variable.error,
      // Complete previewed table structure
      complete_table_row: variable.metadata_json || {},
      enhanced_api_endpoints: {
        analytics: variable.analytics_api,
        metadata: variable.metadata_api,
        data_values: variable.data_values_api,
        export: variable.export_api,
        web_ui: variable.web_ui_url
      }
    })),
    table_export: {
      detected_columns: detectedColumns,
      complete_table_data: variablesData.map(variable => variable.metadata_json || {}),
      structure_type: 'dynamic_from_sql_view'
    },
    summary: generateCombinedSummary(variablesData),
    exportInfo: {
      exportedAt: new Date().toISOString(),
      format: format,
      variableCount: variablesData.length,
      period: options.period,
      orgUnit: options.orgUnit,
      includes_complete_table: true,
      source: 'dynamic_table_structure'
    }
  };

  // Add bulk curl commands if session available
  if (options.session) {
    baseExport.curlCommands = generateBulkCurlCommands(variablesData, options.session, options.period, options.orgUnit);
  }

  switch (format) {
    case 'json':
      return baseExport;
    
    case 'csv':
      return convertCombinedToCSV(baseExport);
    
    case 'xml':
      return convertCombinedToXML(baseExport);
    
    case 'summary':
      return baseExport.summary;
    
    case 'excel':
      return generateExcelStructure(baseExport);
    
    default:
      return baseExport;
  }
}

// Generate combined summary statistics
function generateCombinedSummary(variablesData: any[]) {
  const totalVariables = variablesData.length;
  const successfulVariables = variablesData.filter(v => !v.error && v.analytics).length;
  const totalDataPoints = variablesData.reduce((sum, v) => sum + (v.analytics?.rows?.length || 0), 0);
  const averageQuality = variablesData.reduce((sum, v) => sum + (v.quality_score || 0), 0) / totalVariables;

  return {
    totalVariables,
    successfulVariables,
    failedVariables: totalVariables - successfulVariables,
    successRate: ((successfulVariables / totalVariables) * 100).toFixed(1),
    totalDataPoints,
    averageQualityScore: averageQuality.toFixed(1),
    dataByType: groupDataByType(variablesData)
  };
}

// Group data by variable type
function groupDataByType(variablesData: any[]) {
  const grouped: Record<string, any> = {};
  
  variablesData.forEach(variable => {
    const type = variable.variable_type;
    if (!grouped[type]) {
      grouped[type] = {
        count: 0,
        totalDataPoints: 0,
        averageQuality: 0
      };
    }
    
    grouped[type].count++;
    grouped[type].totalDataPoints += variable.analytics?.rows?.length || 0;
    grouped[type].averageQuality += variable.quality_score || 0;
  });

  // Calculate averages
  Object.keys(grouped).forEach(type => {
    grouped[type].averageQuality = (grouped[type].averageQuality / grouped[type].count).toFixed(1);
  });

  return grouped;
}

// Generate bulk curl commands
function generateBulkCurlCommands(variablesData: any[], session: any, period: string, orgUnit: string) {
  const baseUrl = session.serverUrl;
  const variableUids = variablesData.map(v => v.variable_uid).join(';');
  
  return {
    bulkAnalytics: `curl -X GET "${baseUrl}/analytics?dimension=dx:${variableUids}&dimension=pe:${period}&dimension=ou:${orgUnit}" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`,
    
    bulkMetadata: `curl -X GET "${baseUrl}/metadata?filter=id:in:[${variableUids}]&fields=:all" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`,
    
    individual: variablesData.map(variable => ({
      uid: variable.variable_uid,
      name: variable.variable_name,
      analytics: `curl -X GET "${baseUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:${period}&dimension=ou:${orgUnit}" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`
    })),
    
    note: "Replace 'username:password' with your actual DHIS2 credentials"
  };
}

// Convert combined data to CSV with complete table structure
function convertCombinedToCSV(data: any): string {
  const detectedColumns = data.table_export?.detected_columns || [];
  
  // Create comprehensive CSV header
  const csvHeaders = [
    'Dictionary',
    'Variable_UID',
    'Variable_Name',
    'Type',
    'Quality_Score',
    ...detectedColumns,
    'Data_Values_API',
    'Analytics_API',
    'Period',
    'OrgUnit',
    'Value',
    'Data_Points'
  ];
  
  let csv = csvHeaders.join(',') + '\n';
  
  data.variables.forEach((variable: any) => {
    const completeTableRow = variable.complete_table_row || {};
    
    if (variable.analytics?.rows) {
      variable.analytics.rows.forEach((row: any[]) => {
        const csvValues = [
          `"${data.dictionary.name}"`,
          variable.uid,
          `"${variable.name}"`,
          variable.type,
          variable.qualityScore,
          ...detectedColumns.map((col: string) => `"${String(completeTableRow[col] || '')}"`),
          `"${variable.enhanced_api_endpoints?.data_values || ''}"`,
          `"${variable.enhanced_api_endpoints?.analytics || ''}"`,
          row[1] || 'Unknown',
          row[2] || 'Unknown',
          row[3] || '0',
          '1'
        ];
        csv += csvValues.join(',') + '\n';
      });
    } else {
      const csvValues = [
        `"${data.dictionary.name}"`,
        variable.uid,
        `"${variable.name}"`,
        variable.type,
        variable.qualityScore,
        ...detectedColumns.map((col: string) => `"${String(completeTableRow[col] || '')}"`),
        `"${variable.enhanced_api_endpoints?.data_values || ''}"`,
        `"${variable.enhanced_api_endpoints?.analytics || ''}"`,
        'No Data',
        'No Data',
        'No Data',
        '0'
      ];
      csv += csvValues.join(',') + '\n';
    }
  });

  return csv;
}

// Convert combined data to XML
function convertCombinedToXML(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<combinedExport>
  <dictionary>
    <id>${data.dictionary.id}</id>
    <name><![CDATA[${data.dictionary.name}]]></name>
    <period>${data.exportInfo.period}</period>
    <orgUnit>${data.exportInfo.orgUnit}</orgUnit>
  </dictionary>
  <variables>
    ${data.variables.map((variable: any) => `
    <variable>
      <uid>${variable.uid}</uid>
      <name><![CDATA[${variable.name}]]></name>
      <type>${variable.type}</type>
      <qualityScore>${variable.qualityScore}</qualityScore>
      <analytics>
        ${variable.analytics?.rows ? variable.analytics.rows.map((row: any[]) => 
          `<row><dx>${row[0]}</dx><pe>${row[1]}</pe><ou>${row[2]}</ou><value>${row[3]}</value></row>`
        ).join('') : '<row>No Data</row>'}
      </analytics>
    </variable>`).join('')}
  </variables>
  <summary>
    <totalVariables>${data.summary.totalVariables}</totalVariables>
    <successfulVariables>${data.summary.successfulVariables}</successfulVariables>
    <totalDataPoints>${data.summary.totalDataPoints}</totalDataPoints>
    <averageQualityScore>${data.summary.averageQualityScore}</averageQualityScore>
  </summary>
</combinedExport>`;
}

// Generate Excel-like structure (JSON that can be converted to Excel)
function generateExcelStructure(data: any) {
  return {
    sheets: {
      Summary: [
        ['Dictionary Name', data.dictionary.name],
        ['Export Date', data.exportInfo.exportedAt],
        ['Period', data.exportInfo.period],
        ['Organization Unit', data.exportInfo.orgUnit],
        ['Total Variables', data.summary.totalVariables],
        ['Successful Variables', data.summary.successfulVariables],
        ['Success Rate', `${data.summary.successRate}%`],
        ['Average Quality Score', data.summary.averageQualityScore]
      ],
      Variables: [
        ['UID', 'Name', 'Type', 'Quality Score', 'Data Points', 'Status'],
        ...data.variables.map((v: any) => [
          v.uid,
          v.name,
          v.type,
          v.qualityScore,
          v.analytics?.rows?.length || 0,
          v.error ? 'Error' : 'Success'
        ])
      ],
      Analytics: [
        ['Variable UID', 'Variable Name', 'Period', 'Org Unit', 'Value'],
        ...data.variables.flatMap((v: any) => 
          v.analytics?.rows?.map((row: any[]) => [v.uid, v.name, row[1], row[2], row[3]]) || 
          [[v.uid, v.name, 'No Data', 'No Data', 'No Data']]
        )
      ]
    }
  };
}

// Generate mock analytics data
function generateMockAnalytics(variableUid: string, period: string, orgUnit: string) {
  return {
    headers: [
      { name: 'dx', column: 'Data' },
      { name: 'pe', column: 'Period' },
      { name: 'ou', column: 'Organisation unit' },
      { name: 'value', column: 'Value' }
    ],
    rows: [[variableUid, period, orgUnit, Math.floor(Math.random() * 1000 + 100).toString()]],
    height: 1,
    width: 4
  };
} 