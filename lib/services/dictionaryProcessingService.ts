import { DictionaryService, MetadataDictionary, DictionaryVariable } from './dictionaryService';
import { InstanceService } from './instanceService';
import { SqlViewService } from './sqlViewService';
import { supabase } from '@/lib/supabase';

export interface ProcessingOptions {
  batchSize?: number;
  delayBetweenItems?: number;
  maxRetries?: number;
  onProgress?: (progress: ProcessingProgress) => void;
  onComplete?: (result: ProcessingResult) => void;
  onError?: (error: ProcessingError) => void;
}

export interface ProcessingProgress {
  dictionaryId: string;
  currentItem: number;
  totalItems: number;
  percentage: number;
  currentItemName?: string;
  status: 'processing' | 'completed' | 'error';
}

export interface ProcessingResult {
  dictionaryId: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  processingTime: number;
  variables: DictionaryVariable[];
}

export interface ProcessingError {
  dictionaryId: string;
  error: string;
  step: 'initialization' | 'sql_execution' | 'data_processing' | 'variable_creation';
}

// Global processing state management
const activeProcessingJobs = new Map<string, AbortController>();
const processingCallbacks = new Map<string, ProcessingOptions>();

export class DictionaryProcessingService {
  
  /**
   * Start processing a dictionary by executing its SQL view and creating variables
   */
  static async processDictionary(
    dictionaryId: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    console.log(`🔄 Starting dictionary processing: ${dictionaryId}`);

    // Check if already processing
    if (activeProcessingJobs.has(dictionaryId)) {
      throw new Error('Dictionary is already being processed');
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    activeProcessingJobs.set(dictionaryId, abortController);
    processingCallbacks.set(dictionaryId, options);

    try {
      // Update dictionary status to generating
      await DictionaryService.updateStatus(dictionaryId, 'generating');
      
      // Get dictionary details
      const dictionary = await DictionaryService.getDictionary(dictionaryId);
      if (!dictionary) {
        throw new Error('Dictionary not found');
      }

      console.log(`📊 Processing dictionary: ${dictionary.name} (${dictionary.metadata_type})`);

      // Get instance details
      const instance = await InstanceService.getInstance(dictionary.instance_id);
      if (!instance) {
        throw new Error('Instance not found');
      }

      console.log(`🔗 Using instance: ${instance.name} (${instance.base_url})`);

      // Get instance credentials
      const credentials = await InstanceService.getInstanceCredentials(dictionary.instance_id);
      if (!credentials) {
        throw new Error('Failed to get instance credentials');
      }

      console.log(`🔐 Using credentials for user: ${credentials.username}`);

      // Initialize SQL View Service with instance authentication
      const authString = `${credentials.username}:${credentials.password}`;
      const sqlViewService = new SqlViewService(instance.base_url, authString);
      
      // Execute SQL view to get metadata
      console.log(`🔍 Executing SQL view: ${dictionary.sql_view_id}`);
      console.log(`🔗 Using instance URL: ${instance.base_url}`);
      
      const sqlResult = await sqlViewService.executeView(dictionary.sql_view_id, {
        format: 'json',
        cache: false,
        useCache: false
      });

      if (!sqlResult.data || sqlResult.data.length === 0) {
        console.warn('⚠️ SQL view returned no data');
        await DictionaryService.updateStatus(dictionaryId, 'active');
        return {
          dictionaryId,
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          processingTime: Date.now() - startTime,
          variables: []
        };
      }

      console.log(`✅ SQL view executed successfully: ${sqlResult.data.length} rows returned`);

      // Process metadata items
      const variables: DictionaryVariable[] = [];
      const batchSize = options.batchSize || 50;
      const delay = options.delayBetweenItems || 100;
      
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < sqlResult.data.length; i += batchSize) {
        // Check for cancellation
        if (abortController.signal.aborted) {
          console.log('🛑 Processing cancelled by user');
          throw new Error('Processing cancelled');
        }

        const batch = sqlResult.data.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sqlResult.data.length/batchSize)}`);

        for (const row of batch) {
          try {
            // Check for cancellation
            if (abortController.signal.aborted) {
              throw new Error('Processing cancelled');
            }

            const variable = await this.processMetadataItem(dictionaryId, row, dictionary);
            variables.push(variable);
            successful++;

            // Report progress
            const progress: ProcessingProgress = {
              dictionaryId,
              currentItem: i + batch.indexOf(row) + 1,
              totalItems: sqlResult.data.length,
              percentage: Math.round(((i + batch.indexOf(row) + 1) / sqlResult.data.length) * 100),
              currentItemName: variable.variable_name,
              status: 'processing'
            };

            if (options.onProgress) {
              options.onProgress(progress);
            }

            // Small delay to prevent overwhelming the system
            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }

          } catch (error) {
            console.error(`❌ Error processing item:`, error);
            failed++;
          }
        }
      }

      // Update dictionary with final stats
      const processingTime = (Date.now() - startTime) / 1000; // Convert to seconds
      const successRate = successful > 0 ? (successful / (successful + failed)) * 100 : 0;

      await DictionaryService.updateDictionary(dictionaryId, {
        status: 'active',
        variables_count: successful,
        success_rate: successRate,
        processing_time: Math.round(processingTime),
        quality_average: variables.length > 0 ? 
          variables.reduce((sum, v) => sum + v.quality_score, 0) / variables.length : 0,
        updated_at: new Date().toISOString()
      });

      const result: ProcessingResult = {
        dictionaryId,
        totalProcessed: successful + failed,
        successful,
        failed,
        processingTime: Math.round(processingTime),
        variables
      };

      console.log(`✅ Dictionary processing completed:`, result);

      if (options.onComplete) {
        options.onComplete(result);
      }

      return result;

    } catch (error) {
      console.error(`❌ Dictionary processing failed:`, error);
      
      await DictionaryService.updateStatus(
        dictionaryId, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      );

      const processingError: ProcessingError = {
        dictionaryId,
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'sql_execution'
      };

      if (options.onError) {
        options.onError(processingError);
      }

      throw error;
    } finally {
      // Cleanup
      activeProcessingJobs.delete(dictionaryId);
      processingCallbacks.delete(dictionaryId);
    }
  }

  /**
   * Process a single metadata item and create a dictionary variable
   */
  private static async processMetadataItem(
    dictionaryId: string,
    item: any,
    dictionary: MetadataDictionary
  ): Promise<DictionaryVariable> {
    const startTime = Date.now();

    // Extract common fields from SQL view result
    const uid = item.uid || item.id || item.dataElementId || item.indicatorId || '';
    const name = item.name || item.displayName || item.dataElementName || item.indicatorName || 'Unknown';
    const code = item.code || '';
    const description = item.description || '';

    // Calculate quality score based on available metadata
    let qualityScore = 0;
    if (name && name.length > 3) qualityScore += 25;
    if (description && description.length > 10) qualityScore += 25;
    if (code && code.length > 0) qualityScore += 25;
    if (item.lastUpdated || item.created) qualityScore += 25;

    // Create variable
    const variable: Omit<DictionaryVariable, 'id' | 'created_at'> = {
      dictionary_id: dictionaryId,
      variable_uid: uid,
      variable_name: name,
      variable_type: dictionary.metadata_type,
      quality_score: qualityScore,
      processing_time: Date.now() - startTime,
      status: 'success',
      metadata_json: item,
      analytics_url: this.generateAnalyticsUrl(uid, dictionary)
    };

    return await DictionaryService.addVariable(variable);
  }

  /**
   * Generate analytics URL for a metadata item
   */
  private static generateAnalyticsUrl(uid: string, dictionary: MetadataDictionary): string {
    const baseUrl = 'analytics'; // This could be expanded to full DHIS2 analytics URLs
    return `${baseUrl}?dimension=${uid}&pe=THIS_YEAR&ou=USER_ORGUNIT`;
  }

  /**
   * Cancel processing for a dictionary
   */
  static cancelProcessing(dictionaryId: string): boolean {
    const controller = activeProcessingJobs.get(dictionaryId);
    if (controller) {
      console.log(`🛑 Cancelling processing for dictionary: ${dictionaryId}`);
      controller.abort();
      return true;
    }
    return false;
  }

  /**
   * Check if a dictionary is currently being processed
   */
  static isProcessing(dictionaryId: string): boolean {
    return activeProcessingJobs.has(dictionaryId);
  }

  /**
   * Get list of currently processing dictionaries
   */
  static getActiveProcessingJobs(): string[] {
    return Array.from(activeProcessingJobs.keys());
  }

  /**
   * Process all pending dictionaries (useful for background jobs)
   */
  static async processAllPending(): Promise<void> {
    console.log('🔍 Checking for pending dictionaries to process...');

    try {
      // Get all dictionaries with generating status
      const dictionaries = await DictionaryService.getDictionaries();
      const pending = dictionaries.filter(d => d.status === 'generating');

      if (pending.length === 0) {
        console.log('✅ No pending dictionaries found');
        return;
      }

      console.log(`📋 Found ${pending.length} pending dictionaries`);

      // Process each pending dictionary
      for (const dictionary of pending) {
        if (!this.isProcessing(dictionary.id)) {
          console.log(`🚀 Starting background processing for: ${dictionary.name}`);
          
          // Process in background without waiting
          this.processDictionary(dictionary.id, {
            batchSize: 25,
            delayBetweenItems: 50
          }).catch(error => {
            console.error(`❌ Background processing failed for ${dictionary.id}:`, error);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking pending dictionaries:', error);
    }
  }

  /**
   * Reprocess a dictionary (useful for failed or outdated dictionaries)
   */
  static async reprocessDictionary(dictionaryId: string): Promise<ProcessingResult> {
    console.log(`🔄 Reprocessing dictionary: ${dictionaryId}`);
    
    // First, clean up existing variables
    if (supabase) {
      const { error } = await supabase
        .from('dictionary_variables')
        .delete()
        .eq('dictionary_id', dictionaryId);
      
      if (error) {
        console.warn('⚠️ Error cleaning up existing variables:', error);
      }
    }

    // Reset dictionary status and stats
    await DictionaryService.updateDictionary(dictionaryId, {
      status: 'generating',
      variables_count: 0,
      quality_average: 0,
      success_rate: 0,
      processing_time: 0,
      error_message: null
    });

    // Process the dictionary
    return await this.processDictionary(dictionaryId);
  }
}

// Auto-start processing check on service initialization
setTimeout(() => {
  DictionaryProcessingService.processAllPending();
}, 5000); // Wait 5 seconds after startup

// Set up periodic processing check (every 2 minutes)
setInterval(() => {
  DictionaryProcessingService.processAllPending();
}, 2 * 60 * 1000); 