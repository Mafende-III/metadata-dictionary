import { NextRequest, NextResponse } from 'next/server';
import { DictionaryService, DataElementWithAction } from '@/lib/services/dictionaryService';
import { InstanceService } from '@/lib/services/instanceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dictionary_name,
      instance_id,
      instance_name,
      data_elements,
      default_action = 'imported',
      metadata_type = 'dataElements'
    } = body;

    if (!dictionary_name || !instance_id || !data_elements || !Array.isArray(data_elements)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: dictionary_name, instance_id, data_elements (array)'
      }, { status: 400 });
    }

    if (data_elements.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data elements provided - data_elements array is empty'
      }, { status: 400 });
    }

    console.log(`💾 Starting enhanced dictionary save with action tracking`);
    console.log(`📊 Processing ${data_elements.length} data elements for "${dictionary_name}"`);

    // Get instance details
    const instance = await InstanceService.getInstance(instance_id);
    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    // Create the dictionary
    const dictionaryData = {
      name: dictionary_name,
      description: `Data elements dictionary with action tracking. Generated on ${new Date().toLocaleDateString()}. Contains ${data_elements.length} elements with group associations.`,
      instance_id,
      instance_name: instance_name || instance.name,
      metadata_type: metadata_type as any,
      sql_view_id: 'manual_import',
      processing_method: 'individual' as const,
      period: new Date().getFullYear().toString()
    };

    const newDictionary = await DictionaryService.createDictionary(dictionaryData);
    console.log(`✅ Dictionary created successfully: ${newDictionary.id}`);

    // Validate and enhance data elements with action tracking
    const enhancedElements: DataElementWithAction[] = data_elements.map((element: any, index: number) => {
      // Validate required fields
      if (!element.DATA_ELEMENT_ID || !element.DATA_ELEMENT_NAME) {
        throw new Error(`Missing required fields in element at index ${index}: DATA_ELEMENT_ID and DATA_ELEMENT_NAME are required`);
      }

      return {
        DATA_ELEMENT_ID: element.DATA_ELEMENT_ID,
        DATA_ELEMENT_NAME: element.DATA_ELEMENT_NAME,
        GROUP_ID: element.GROUP_ID || 'unassigned',
        GROUP_NAME: element.GROUP_NAME || 'Unassigned Group',
        action: element.action || default_action,
        action_details: {
          import_batch: new Date().toISOString(),
          source_index: index,
          original_data: element,
          ...element.action_details
        }
      };
    });

    // Save data elements with action tracking
    const result = await DictionaryService.saveDataElementsWithActions(
      newDictionary.id,
      enhancedElements,
      instance.base_url,
      instance_id
    );

    // Update dictionary with final statistics
    const processingTime = 0; // Manual import is immediate
    const successRate = result.successful > 0 ? (result.successful / (result.successful + result.failed)) * 100 : 0;
    const avgQualityScore = result.variables.length > 0 ? 
      result.variables.reduce((sum, v) => sum + v.quality_score, 0) / result.variables.length : 0;

    await DictionaryService.updateDictionary(newDictionary.id, {
      status: result.successful > 0 ? 'active' : 'error',
      variables_count: result.successful,
      success_rate: successRate,
      processing_time: processingTime,
      quality_average: avgQualityScore,
      error_message: result.failed > 0 ? `${result.failed} elements failed to save` : undefined,
      updated_at: new Date().toISOString()
    });

    // Generate comprehensive response
    const response = {
      success: true,
      data: {
        dictionary_id: newDictionary.id,
        dictionary_name: newDictionary.name,
        total_elements: data_elements.length,
        successful: result.successful,
        failed: result.failed,
        success_rate: successRate,
        quality_average: avgQualityScore,
        action_summary: {
          imported: result.variables.filter(v => v.action === 'imported').length,
          created: result.variables.filter(v => v.action === 'created').length,
          updated: result.variables.filter(v => v.action === 'updated').length,
          deprecated: result.variables.filter(v => v.action === 'deprecated').length,
          replaced: result.variables.filter(v => v.action === 'replaced').length,
          merged: result.variables.filter(v => v.action === 'merged').length
        },
        group_distribution: enhancedElements.reduce((acc: any, element) => {
          const groupName = element.GROUP_NAME;
          acc[groupName] = (acc[groupName] || 0) + 1;
          return acc;
        }, {}),
        sample_variables: result.variables.slice(0, 5).map(v => ({
          id: v.variable_uid,
          name: v.variable_name,
          action: v.action,
          group: v.group_name,
          quality_score: v.quality_score,
          api_url: v.api_url
        })),
        api_access: {
          base_url: instance.base_url,
          dictionary_export: `/api/dictionaries/${newDictionary.id}/export/combined`,
          analytics_base: `${instance.base_url}/api/analytics`,
          bulk_download: `${instance.base_url}/api/dataElements.json?filter=id:in:[${result.variables.map(v => v.variable_uid).join(',')}]`
        }
      }
    };

    console.log(`✅ Enhanced dictionary save completed successfully`);
    console.log(`📊 Final stats: ${result.successful}/${data_elements.length} saved, ${avgQualityScore.toFixed(1)}% avg quality`);

    return NextResponse.json(response);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Enhanced dictionary save failed:', errorMessage);

    return NextResponse.json({
      success: false,
      error: 'Failed to save dictionary with action tracking',
      details: errorMessage
    }, { status: 500 });
  }
} 