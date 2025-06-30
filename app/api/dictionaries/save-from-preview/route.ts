import { NextRequest, NextResponse } from 'next/server';
import { DictionaryService } from '@/lib/services/dictionaryService';
import { InstanceService } from '@/lib/services/instanceService';

export async function POST(request: NextRequest) {
  let dictionaryCreated = false;
  let dictionaryId: string | null = null;

  try {
    const body = await request.json();
    const { 
      preview_id,
      dictionary_name,
      instance_id,
      instance_name,
      metadata_type,
      sql_view_id,
      group_id,
      structured_data,
      detected_columns,
      column_metadata,
      quality_score,
      execution_time
    } = body;

    if (!preview_id || !dictionary_name || !instance_id || !sql_view_id || !structured_data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: preview_id, dictionary_name, instance_id, sql_view_id, structured_data'
      }, { status: 400 });
    }

    if (!Array.isArray(structured_data) || structured_data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data to save - structured_data is empty'
      }, { status: 400 });
    }

    console.log(`💾 Starting dictionary save from preview: ${preview_id}`);
    console.log(`📊 Processing ${structured_data.length} variables for "${dictionary_name}"`);

    // Get instance details for API URL generation
    const instance = await InstanceService.getInstance(instance_id);
    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    // Step 1: Create the dictionary first with table structure preserved
    const dictionaryData = {
      name: dictionary_name,
      description: `Generated from SQL view preview on ${new Date().toLocaleDateString()}. Contains ${structured_data.length} ${metadata_type || 'dataElements'}.`,
      instance_id,
      instance_name,
      metadata_type: metadata_type || 'dataElements',
      sql_view_id,
      group_id,
      processing_method: 'preview' as const,
      period: new Date().getFullYear().toString(),
      // Store the dynamic table structure from the preview
      data: {
        detected_columns: detected_columns,
        column_metadata: column_metadata,
        preview_structure: {
          total_rows: structured_data.length,
          table_format: 'dynamic',
          source: 'sql_view_preview'
        }
      }
    };

    const newDictionary = await DictionaryService.createDictionary(dictionaryData);
    dictionaryCreated = true;
    dictionaryId = newDictionary.id;

    console.log(`✅ Dictionary created successfully: ${newDictionary.id}`);

    // Step 2: Process variables with comprehensive API URLs
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const processedVariables = [];

    // Helper function to extract UID from any column
    const extractUID = (item: any) => {
      // PRIORITY 1: Check for specific DHIS2 UID fields first (11-character alphanumeric)
      const dhis2UidFields = ['data_element_id', 'indicator_id', 'program_indicator_id', 'uid', 'id'];
      
      for (const field of dhis2UidFields) {
        if (item[field] && typeof item[field] === 'string' && 
            item[field].length === 11 && /^[a-zA-Z0-9]{11}$/.test(item[field])) {
          console.log(`🎯 Found DHIS2 UID in field '${field}': ${item[field]}`);
          return item[field];
        }
      }
      
      // PRIORITY 2: Check standard UID field names
      const standardUidFields = ['dataElementId', 'indicatorId', 'programIndicatorId', 'dataElementGroupId', 'indicatorGroupId'];
      
      for (const field of standardUidFields) {
        if (item[field] && typeof item[field] === 'string' && 
            item[field].length === 11 && /^[a-zA-Z0-9]{11}$/.test(item[field])) {
          console.log(`🎯 Found DHIS2 UID in field '${field}': ${item[field]}`);
          return item[field];
        }
      }
      
      // PRIORITY 3: Scan all fields that look like DHIS2 UIDs (11 characters, alphanumeric)
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string' && value.length === 11 && /^[a-zA-Z0-9]{11}$/.test(value)) {
          console.log(`🔍 Found potential DHIS2 UID in column '${key}': ${value}`);
          return value;
        }
      }
      
      console.warn(`⚠️ No valid DHIS2 UID found in item:`, Object.keys(item));
      return null;
    };

    // Helper function to extract name from any column
    const extractName = (item: any) => {
      const nameFields = ['name', 'displayName', 'dataElementName', 'indicatorName', 'description', 'title'];
      
      for (const field of nameFields) {
        if (item[field] && typeof item[field] === 'string' && item[field].trim().length > 0) {
          return item[field].trim();
        }
      }
      
      // If no standard name field, use the first string field that's not a UID
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string' && value.length > 11 && value.trim().length > 0) {
          return value.trim();
        }
      }
      
      return 'Unnamed Variable';
    };

    for (const [index, item] of structured_data.entries()) {
      try {
        // Extract UID from any column in the table
        const uid = extractUID(item);
        if (!uid) {
          console.warn(`⚠️ No UID found for row ${index + 1}, skipping...`);
          failed++;
          continue;
        }

        // Extract name from any column in the table
        const name = extractName(item);
        
        // Calculate quality score based on data completeness
        let itemQuality = 0;
        const nonEmptyFields = Object.values(item).filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
        const totalFields = Object.keys(item).length;
        itemQuality = Math.round((nonEmptyFields / totalFields) * 100);

        // Generate clean data value API URL (without hardcoded period/orgUnit per DHIS2 docs)
        const generateCleanDataValueApiUrl = (uid: string, metadataType: string, baseUrl: string) => {
          switch (metadataType) {
            case 'dataElements':
              // Clean dataValueSets API - only mandatory dataElement parameter
              return `${baseUrl}/api/dataValueSets?dataElement=${uid}`;
            case 'indicators':
            case 'programIndicators':
              // Clean analytics API - only mandatory dimension parameter  
              return `${baseUrl}/api/analytics?dimension=dx:${uid}`;
            default:
              // Default to analytics for unknown types
              return `${baseUrl}/api/analytics?dimension=dx:${uid}`;
          }
        };

        // Prepare variable data with the complete table row preserved
        const variableData = {
          dictionary_id: newDictionary.id,
          variable_uid: uid,
          variable_name: name,
          variable_type: metadata_type || 'dataElements',
          quality_score: itemQuality,
          processing_time: Math.round((execution_time || 0) / structured_data.length),
          status: 'success' as const,
          metadata_json: item, // Store complete table row data
          analytics_url: `${instance.base_url}/api/analytics?dimension=dx:${uid}`,
          // Generate the clean data value API URL (no hardcoded parameters)
          data_values_api: generateCleanDataValueApiUrl(uid, metadata_type || 'dataElements', instance.base_url)
        };

        // Create variable with comprehensive API URLs
        const variable = await DictionaryService.createVariableWithApiUrls(
          variableData,
          instance.base_url,
          instance_id
        );

        processedVariables.push(variable);
        successful++;

        console.log(`✅ Processed ${name} (${uid}) with data value API: ${variableData.data_values_api}`);

        if (successful % 10 === 0) {
          console.log(`📈 Progress: ${successful}/${structured_data.length} variables processed`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const itemName = item.name || item.displayName || item.dataElementName || item.indicatorName || `item_${index}`;
        console.error(`❌ Error creating variable for ${itemName}:`, errorMsg);
        errors.push(`${itemName}: ${errorMsg}`);
        failed++;
      }
    }

    console.log(`📊 Variable processing complete: ${successful} successful, ${failed} failed`);

    // Step 3: Update dictionary with final statistics
    const processingTime = execution_time ? Math.round(execution_time / 1000) : 0;
    const successRate = successful > 0 ? (successful / (successful + failed)) * 100 : 0;
    const finalQualityScore = quality_score || (successful > 0 ? 
      processedVariables.reduce((sum, v) => sum + v.quality_score, 0) / successful : 0);

    try {
      await DictionaryService.updateDictionary(newDictionary.id, {
        status: successful > 0 ? 'active' : 'error',
        variables_count: successful,
        success_rate: successRate,
        processing_time: processingTime,
        quality_average: finalQualityScore,
        error_message: failed > 0 ? `${failed} variables failed to process` : undefined,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ Dictionary updated with final stats: ${successful} variables, ${finalQualityScore.toFixed(1)}% quality`);

    } catch (updateError) {
      console.error('❌ Failed to update dictionary with final stats:', updateError);
      // Continue anyway since variables were created successfully
    }

    // Return comprehensive response
    const response = {
      success: true,
      data: {
        dictionary_id: newDictionary.id,
        dictionary_name: newDictionary.name,
        variables_count: successful,
        failed_count: failed,
        quality_score: finalQualityScore,
        success_rate: successRate,
        processing_time: processingTime,
        status: successful > 0 ? 'saved' : 'error',
        variables_sample: processedVariables.slice(0, 5).map(v => ({
          id: v.id,
          name: v.variable_name,
          uid: v.variable_uid,
          api_url: v.api_url,
          download_url: v.download_url,
          analytics_url: v.analytics_url,
          quality_score: v.quality_score
        })),
        api_access: {
          base_url: instance.base_url,
          export_formats: ['json', 'xml', 'csv', 'pdf'],
          bulk_download: `${instance.base_url}/${metadata_type}.json?filter=id:in:[${processedVariables.map(v => v.variable_uid).join(',')}]`
        }
      },
      errors: failed > 0 ? errors.slice(0, 10) : undefined // Limit error details
    };

    if (failed > 0) {
      console.warn(`⚠️ Dictionary saved with ${failed} variable failures`);
    }

    return NextResponse.json(response);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Fatal error saving dictionary from preview:', errorMessage);

    // If dictionary was created but variables failed, update status to error
    if (dictionaryCreated && dictionaryId) {
      try {
        await DictionaryService.updateDictionary(dictionaryId, {
          status: 'error',
          error_message: `Failed to save variables: ${errorMessage}`,
          updated_at: new Date().toISOString()
        });
        console.log(`⚠️ Dictionary ${dictionaryId} marked as error due to variable processing failure`);
      } catch (updateError) {
        console.error('❌ Failed to mark dictionary as error:', updateError);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to save dictionary',
      details: errorMessage,
      dictionary_id: dictionaryId // Include for debugging
    }, { status: 500 });
  }
} 