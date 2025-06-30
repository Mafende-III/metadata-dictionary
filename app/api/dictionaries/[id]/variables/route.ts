import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/middleware/auth';
import { DHIS2ApiUrlService } from '@/lib/services/dhis2ApiUrlService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    console.log('🔍 Fetching variables for dictionary:', id);

    // Get authenticated session for DHIS2 API calls
    const session = await getAuthenticatedSession(request);
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 });
    }

    // Fetch variables from database
    const { data: rawVariables, error } = await supabase
      .from('dictionary_variables')
      .select(`
        id,
        variable_uid,
        variable_name,
        variable_type,
        quality_score,
        processing_time,
        status,
        error_message,
        metadata_json,
        analytics_url,
        api_url,
        download_url,
        dhis2_url,
        data_values_api,
        export_formats,
        created_at
      `)
      .eq('dictionary_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching variables:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch variables from database',
        details: error.message
      }, { status: 500 });
    }

    // If no variables found and we have a session, try to fetch from DHIS2
    if ((!rawVariables || rawVariables.length === 0) && session) {
      console.log('📥 No variables in database, attempting to fetch from DHIS2');
      
      try {
        // Get dictionary metadata to determine what to fetch
        const { data: dictionary } = await supabase
          .from('metadata_dictionaries')
          .select('metadata_type, group_id, instance_name')
          .eq('id', id)
          .single();

        if (dictionary) {
          const freshVariables = await fetchVariablesFromDHIS2(session, dictionary, id);
          
          if (freshVariables && freshVariables.length > 0) {
            console.log(`✅ Fetched ${freshVariables.length} variables from DHIS2`);
            return NextResponse.json({
              success: true,
              data: freshVariables,
              source: 'dhis2_fresh'
            });
          }
        }
      } catch (dhisError) {
        console.error('❌ Error fetching from DHIS2:', dhisError);
      }
    }

    // Enhance variables with proper DHIS2 API URLs if session available
    let variables: any[];
    if (session && rawVariables && rawVariables.length > 0) {
      const enhancedVariables = rawVariables.map(variable => {
        // Use original metadata from SQL view JSON response for names
        const originalMetadata = variable.metadata_json || {};
        const actualVariableName = originalMetadata.name || 
                                 originalMetadata.displayName || 
                                 originalMetadata.dataElementName || 
                                 originalMetadata.indicatorName || 
                                 variable.variable_name;

        // Generate clean DHIS2 API URLs using the actual DHIS2 UID (not database UUID)
        const dhis2UID = variable.variable_uid; // This is the actual DHIS2 UID from metadata
        const baseUrl = session.serverUrl.replace(/\/api$/, '');
        const apiEndpoint = `${baseUrl}/api`;
        
        // Clean API URLs per DHIS2 documentation using the correct UID
        const cleanApiUrls = {
          // Analytics API - using the actual DHIS2 UID
          analytics: `${apiEndpoint}/analytics?dimension=dx:${dhis2UID}`,
          // Metadata API - get full metadata object using the actual UID
          metadata: `${apiEndpoint}/${variable.variable_type}/${dhis2UID}.json`,
          // Data Values API - only for dataElements, not indicators, using actual UID
          dataValues: variable.variable_type === 'dataElements' ? 
            `${apiEndpoint}/dataValueSets?dataElement=${dhis2UID}` : null,
          // Export URL for metadata using actual UID
          export: `${apiEndpoint}/${variable.variable_type}.json?filter=id:eq:${dhis2UID}`,
          // DHIS2 Web UI link using actual UID
          webUi: `${baseUrl}/dhis-web-maintenance/#/list/${variable.variable_type.toLowerCase()}/view/${dhis2UID}`
        };

        return {
          // CRITICAL FIX: Return the actual DHIS2 UID as 'uid', not the database UUID
          uid: dhis2UID, // This should be the 11-character DHIS2 UID like "OwvmJaiVIBU"
          id: variable.id, // Keep database UUID as separate id field
          name: actualVariableName,
          type: variable.variable_type,
          quality_score: variable.quality_score,
          status: variable.status,
          created_at: variable.created_at,
          
          // Include the clean data values API URL from database
          data_values_api: variable.data_values_api,
          
          // Store complete table row data from SQL view
          complete_table_row: originalMetadata,
          
          // FIXED: API endpoints now use the actual DHIS2 UID
          api_endpoints: cleanApiUrls
        };
      });

      // Use enhanced variables
      variables = enhancedVariables;
    } else {
      // Even without session, ensure uid field uses DHIS2 UID, not database UUID
      variables = (rawVariables || []).map(variable => ({
        ...variable,
        uid: variable.variable_uid, // Use actual DHIS2 UID as uid field
        id: variable.id, // Keep database UUID as separate id field
        data_values_api: variable.data_values_api // Include clean data values API URL
      }));
    }

    console.log(`✅ Found ${variables?.length || 0} variables for dictionary ${id}`);

    return NextResponse.json({
      success: true,
      data: variables || [],
      source: 'database'
    });

  } catch (error: unknown) {
    console.error('❌ Unexpected error fetching variables:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Fetch variables from DHIS2 API
async function fetchVariablesFromDHIS2(session: any, dictionary: any, dictionaryId: string) {
  try {
    const metadataType = dictionary.metadata_type;
    let apiUrl = `${session.serverUrl}/${metadataType}?fields=id,name,description,valueType,aggregationType,lastUpdated&paging=false`;
    
    // Add group filter if specified
    if (dictionary.group_id) {
      apiUrl += `&filter=${metadataType}Groups.id:eq:${dictionary.group_id}`;
    }

    console.log('🔗 Fetching from DHIS2 API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': session.authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`DHIS2 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data[metadataType] || [];

    console.log(`📋 Processing ${items.length} items from DHIS2`);

    // Process and save variables to database
    const processedVariables = items.map((item: any) => {
      const qualityScore = calculateQualityScore(item);
      
      // Generate proper API URLs using the new service
      const apiUrls = DHIS2ApiUrlService.generateApiUrls(session.serverUrl, {
        variableUid: item.id,
        variableType: metadataType,
        period: 'THIS_YEAR',
        orgUnit: 'USER_ORGUNIT',
        format: 'json'
      });
      
      return {
        dictionary_id: dictionaryId,
        variable_uid: item.id,
        variable_name: item.name || 'Unnamed',
        variable_type: metadataType,
        quality_score: qualityScore,
        status: 'success',
        metadata_json: item,
        analytics_url: apiUrls.analytics,
        api_url: apiUrls.metadata,
        download_url: apiUrls.exportUrl,
        dhis2_url: apiUrls.dhis2WebUrl,
        export_formats: ['json', 'xml', 'csv', 'pdf']
      };
    });

    // Save to database if supabase is available
    if (supabase && processedVariables.length > 0) {
      const { error } = await supabase
        .from('dictionary_variables')
        .upsert(processedVariables, { 
          onConflict: 'dictionary_id,variable_uid',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ Error saving variables to database:', error);
      } else {
        console.log(`✅ Saved ${processedVariables.length} variables to database`);
        
        // Update dictionary statistics
        await updateDictionaryStats(dictionaryId);
      }
    }

    return processedVariables;

  } catch (error) {
    console.error('❌ Error fetching variables from DHIS2:', error);
    throw error;
  }
}

// Calculate quality score based on metadata completeness
function calculateQualityScore(item: any): number {
  let score = 0;
  let maxScore = 4;

  // Has description
  if (item.description && item.description.trim().length > 0) {
    score += 1;
  }

  // Has code
  if (item.code && item.code.trim().length > 0) {
    score += 1;
  }

  // Has proper value type
  if (item.valueType && item.valueType !== 'UNKNOWN') {
    score += 1;
  }

  // Recently updated (within last 2 years)
  if (item.lastUpdated) {
    const lastUpdated = new Date(item.lastUpdated);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    if (lastUpdated > twoYearsAgo) {
      score += 1;
    }
  }

  return Math.round((score / maxScore) * 100);
}

// Update dictionary statistics
async function updateDictionaryStats(dictionaryId: string) {
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('update_dictionary_stats', {
      p_dictionary_id: dictionaryId
    });

    if (error) {
      console.error('❌ Error updating dictionary stats:', error);
    }
  } catch (error) {
    console.error('❌ Error calling update_dictionary_stats:', error);
  }
} 