import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/middleware/auth';
import { 
  isEnhancedExportEnabled, 
  isGroupValidationEnabled, 
  isDynamicColumnsEnabled,
  recordExportError,
  recordGroupValidationError,
  recordDynamicColumnsError
} from '@/lib/utils/featureFlags';

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

// 🔑 ENHANCED: Generate export data with feature flags, error tracking and group validation
async function generateExportData(variable: any, data: any, format: string, options: any) {
  // 🔑 FEATURE FLAGS: Check if enhanced features are enabled
  const enhancedExportFeatureEnabled = isEnhancedExportEnabled();
  const groupValidationFeatureEnabled = isGroupValidationEnabled();
  const dynamicColumnsFeatureEnabled = isDynamicColumnsEnabled();
  
  console.log('🎛️ Feature flags status:', {
    enhancedExport: enhancedExportFeatureEnabled,
    groupValidation: groupValidationFeatureEnabled,
    dynamicColumns: dynamicColumnsFeatureEnabled
  });

  try {
    // 🔑 ENHANCED: Check for enhanced export data and group validation issues
    const enhancedExportData = enhancedExportFeatureEnabled ? (variable.enhanced_export_data || {}) : {};
    const hasEnhancedData = enhancedExportFeatureEnabled && 
                           enhancedExportData.complete_table_row && 
                           Object.keys(enhancedExportData.complete_table_row).length > 0;
    
    // 🔑 NEW: Group validation tracking (with feature flag)
    const groupValidation = groupValidationFeatureEnabled ? (enhancedExportData.group_context || {}) : {};
    const groupValidationStatus = {
      has_group_context: groupValidationFeatureEnabled && !!groupValidation.group_id,
      group_id: groupValidation.group_id,
      metadata_type: groupValidation.metadata_type,
      potential_issues: groupValidation.validation_notes || [],
      validation_timestamp: new Date().toISOString(),
      feature_enabled: groupValidationFeatureEnabled
    };

  const baseExport = {
    variable: {
      uid: variable.variable_uid,
      name: variable.variable_name,
      type: variable.variable_type,
      description: data.metadata?.description || variable.metadata_json?.description,
      qualityScore: variable.quality_score
    },
    // 🔑 ENHANCED: Complete previewed table structure with fallback and feature flags
    complete_table_row: hasEnhancedData ? enhancedExportData.complete_table_row : (variable.metadata_json || {}),
    table_structure: {
      source: 'sql_view_preview',
      dynamic_structure: dynamicColumnsFeatureEnabled,
      original_columns: hasEnhancedData ? 
        Object.keys(enhancedExportData.complete_table_row) : 
        (variable.metadata_json ? Object.keys(variable.metadata_json) : []),
      // 🔑 NEW: Enhanced export metadata with feature flags
      enhanced_export_version: hasEnhancedData ? '1.0.0' : 'legacy',
      detected_columns: dynamicColumnsFeatureEnabled ? (enhancedExportData.detected_columns || []) : [],
      table_preservation_status: hasEnhancedData ? 'complete' : 'basic',
      feature_flags: {
        enhanced_export_enabled: enhancedExportFeatureEnabled,
        group_validation_enabled: groupValidationFeatureEnabled,
        dynamic_columns_enabled: dynamicColumnsFeatureEnabled
      }
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
    // 🔑 NEW: Group validation and error tracking
    group_validation: groupValidationStatus,
    exportInfo: {
      period: options.period,
      orgUnit: options.orgUnit,
      exportedAt: new Date().toISOString(),
      format: format,
      includes_complete_table: hasEnhancedData,
      source: 'dynamic_table_structure',
      // 🔑 NEW: Enhanced export tracking
      enhanced_export_features: {
        complete_table_preservation: hasEnhancedData,
        dynamic_columns_preserved: (enhancedExportData.detected_columns || []).length > 0,
        group_validation_available: !!groupValidation.group_id,
        fallback_used: !hasEnhancedData
      }
    }
  };

  // Add curl command if requested
  if (options.includeCurl && options.session) {
    baseExport.curlCommand = generateCurlCommand(variable, options.session, options.period, options.orgUnit);
  }

  return baseExport;

  } catch (error) {
    // 🔑 ERROR TRACKING: Record errors for feature flag monitoring
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in export generation';
    
    if (enhancedExportFeatureEnabled) {
      recordExportError(`Export generation failed: ${errorMessage}`);
    }
    
    if (groupValidationFeatureEnabled) {
      recordGroupValidationError(`Group validation failed: ${errorMessage}`);
    }
    
    if (dynamicColumnsFeatureEnabled) {
      recordDynamicColumnsError(`Dynamic columns processing failed: ${errorMessage}`);
    }
    
    console.error('❌ Enhanced export generation failed:', error);
    
    // 🔑 FALLBACK: Return basic export structure when enhanced features fail
    return {
      variable: {
        uid: variable.variable_uid,
        name: variable.variable_name,
        type: variable.variable_type,
        qualityScore: variable.quality_score
      },
      complete_table_row: variable.metadata_json || {},
      table_structure: {
        source: 'sql_view_preview',
        dynamic_structure: false,
        original_columns: variable.metadata_json ? Object.keys(variable.metadata_json) : [],
        enhanced_export_version: 'fallback',
        detected_columns: [],
        table_preservation_status: 'basic',
        feature_flags: {
          enhanced_export_enabled: false,
          group_validation_enabled: false,
          dynamic_columns_enabled: false
        },
        error_fallback: true,
        error_message: errorMessage
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
      group_validation: {
        has_group_context: false,
        feature_enabled: false,
        error_fallback: true
      },
      exportInfo: {
        period: options.period,
        orgUnit: options.orgUnit,
        exportedAt: new Date().toISOString(),
        format: format,
        includes_complete_table: false,
        source: 'fallback_after_error',
        enhanced_export_features: {
          complete_table_preservation: false,
          dynamic_columns_preserved: false,
          group_validation_available: false,
          fallback_used: true,
          error_occurred: true
        }
      }
    };
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