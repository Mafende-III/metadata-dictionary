import { DHIS2Client } from '../dhis2';
import { SqlViewExecutionOptions } from './sqlViewServiceLegacy';

/**
 * Dedicated service for SQL View API interactions
 * Handles execution, metadata retrieval, and DHIS2 communication
 */
export class SqlViewApiService {
  private client: DHIS2Client;

  constructor(client: DHIS2Client) {
    this.client = client;
  }

  /**
   * Execute SQL view and return raw data
   * CRITICAL: Executes materialized view first, then fetches data
   */
  async executeView(
    sqlViewId: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<{ data: unknown[]; headers: string[]; executionTime: number }> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting SQL view execution:', sqlViewId);
      
      // Step 1: Execute/refresh the materialized view first (CRITICAL!)
      try {
        console.log('⚡ Executing materialized view...');
        await this.client.axiosInstance.post(`/sqlViews/${sqlViewId}/execute`);
        console.log('✅ Materialized view executed successfully');
      } catch (executeError) {
        console.warn('⚠️ View execution failed, continuing with data fetch:', executeError);
        // Continue - might be a VIEW type that doesn't need execution
      }
      
      // Step 2: Build data URL with proper parameters
      const url = this.buildExecutionUrl(sqlViewId, options);
      console.log('🔄 Fetching SQL view data:', url);
      
      // Step 3: Fetch the data
      const response = await this.client.axiosInstance.get(url);
      const executionTime = Date.now() - startTime;
      
      // Step 4: Handle DHIS2 response formats
      let data: unknown[] = [];
      let headers: string[] = [];
      
      if (response.data) {
        // DHIS2 ListGrid format (most common for SQL views)
        if (response.data.listGrid) {
          const listGrid = response.data.listGrid;
          data = listGrid.rows || [];
          
          // Extract headers from listGrid.headers array
          if (listGrid.headers && Array.isArray(listGrid.headers)) {
            headers = listGrid.headers.map((header: any) => header.name || header.column || '');
          }
          
          console.log(`📊 DHIS2 ListGrid format: ${data.length} rows, ${headers.length} columns`);
          console.log(`📋 Title: ${listGrid.title || 'No title'}`);
          console.log(`📝 Headers: ${headers.join(', ')}`);
        }
        // DHIS2 standard format: { rows: [], headers: [], width: N, height: N }
        else if (Array.isArray(response.data.rows)) {
          data = response.data.rows;
          headers = response.data.headers || [];
          console.log(`📊 Standard DHIS2 format: ${data.length} rows, ${headers.length} columns`);
        } 
        // Direct array response (rare)
        else if (Array.isArray(response.data)) {
          data = response.data;
          headers = data.length > 0 ? Object.keys(data[0] as object) : [];
          console.log(`📊 Direct array format: ${data.length} rows`);
        }
        // Wrapped data response 
        else if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
          headers = response.data.headers || (data.length > 0 ? Object.keys(data[0] as object) : []);
          console.log(`📊 Wrapped format: ${data.length} rows`);
        }
        // Empty or unexpected format
        else {
          console.warn('⚠️ Unexpected response format:', {
            hasListGrid: !!response.data.listGrid,
            hasRows: !!response.data.rows,
            isArray: Array.isArray(response.data),
            keys: Object.keys(response.data)
          });
          data = [];
          headers = [];
        }
      }
      
      console.log(`✅ SQL view data retrieved: ${data.length} rows, ${headers.length} columns in ${executionTime}ms`);
      
      return { data, headers, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ SQL view execution failed:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Authentication failed - check credentials');
        } else if (error.message.includes('404')) {
          throw new Error(`SQL view not found: ${sqlViewId}`);
        } else if (error.message.includes('403')) {
          throw new Error('Insufficient permissions to access SQL view');
        }
      }
      
      throw new Error(`SQL view execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute query-based SQL view (for dynamic SQL)
   */
  async executeQueryView(
    query: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<{ data: unknown[]; headers: string[]; executionTime: number }> {
    const startTime = Date.now();
    
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      
      if (options.parameters) {
        Object.entries(options.parameters).forEach(([key, value]) => {
          params.append(key, value);
        });
      }
      
      const url = `/sqlViews/execute?${params.toString()}`;
      console.log('🔄 Executing dynamic SQL query');
      
      const response = await this.client.axiosInstance.get(url);
      const executionTime = Date.now() - startTime;
      
      const data = response.data?.rows || response.data || [];
      const headers = response.data?.headers || (data.length > 0 ? Object.keys(data[0] as object) : []);
      
      console.log(`✅ Dynamic SQL executed successfully in ${executionTime}ms, ${data.length} rows`);
      
      return { data, headers, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Dynamic SQL execution failed:', error);
      throw new Error(`Dynamic SQL execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get SQL view metadata
   */
  async getSqlViewMetadata(sqlViewId: string): Promise<unknown> {
    try {
      console.log('📋 Fetching SQL view metadata:', sqlViewId);
      
      const response = await this.client.axiosInstance.get(`/sqlViews/${sqlViewId}`, {
        params: {
          fields: '*'
        }
      });
      
      console.log('✅ SQL view metadata retrieved');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch SQL view metadata:', error);
      throw new Error(`Failed to fetch SQL view metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate SQL view
   */
  async validateView(uid: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      console.log('🔍 Validating SQL view:', uid);
      
      const response = await this.client.axiosInstance.get(`/sqlViews/${uid}/validate`);
      
      if (response.status === 200) {
        console.log('✅ SQL view is valid');
        return { isValid: true };
      } else {
        const error = response.data?.message || 'Validation failed';
        console.log('❌ SQL view validation failed:', error);
        return { isValid: false, error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ SQL view validation error:', errorMessage);
      return { isValid: false, error: errorMessage };
    }
  }

  /**
   * Create new SQL view
   */
  async createSqlView(payload: {
    name: string;
    sqlQuery: string;
    description?: string;
    cacheStrategy?: string;
  }): Promise<{ success: boolean; uid?: string; error?: string }> {
    try {
      console.log('🆕 Creating SQL view:', payload.name);
      
      const response = await this.client.axiosInstance.post('/sqlViews', payload);
      
      if (response.status === 201 || response.status === 200) {
        const uid = response.data?.response?.uid || response.data?.uid;
        console.log('✅ SQL view created successfully:', uid);
        return { success: true, uid };
      } else {
        const error = response.data?.message || 'Creation failed';
        console.log('❌ SQL view creation failed:', error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ SQL view creation error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Refresh materialized view
   */
  async refreshMaterializedView(sqlViewId: string): Promise<void> {
    try {
      console.log('🔄 Refreshing materialized view:', sqlViewId);
      
      await this.client.axiosInstance.post(`/sqlViews/${sqlViewId}/refresh`);
      
      console.log('✅ Materialized view refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh materialized view:', error);
      throw new Error(`Failed to refresh materialized view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build execution URL with parameters and filters (DHIS2 2.40+ compatible)
   */
  private buildExecutionUrl(sqlViewId: string, options: SqlViewExecutionOptions): string {
    const params = new URLSearchParams();
    
    // Add format if specified (default is JSON)
    if (options.format && options.format !== 'json') {
      params.append('format', options.format);
    }
    
    // Add variables using DHIS2 format: var=variableName:value
    if (options.parameters) {
      Object.entries(options.parameters).forEach(([key, value]) => {
        // DHIS2 expects format: var=varName:varValue
        params.append('var', `${key}:${value}`);
      });
    }
    
    // Add filters using DHIS2 format
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        // DHIS2 filter format: criteria=column:value
        params.append('criteria', `${key}:${value}`);
      });
    }
    
    // Add paging parameters if specified
    if (options.page) {
      params.append('page', String(options.page));
    }
    if (options.pageSize) {
      params.append('pageSize', String(options.pageSize));
    }
    
    const queryString = params.toString();
    const baseUrl = `/sqlViews/${sqlViewId}/data`;
    
    console.log(`🔗 Built URL: ${baseUrl}${queryString ? '?' + queryString : ''}`);
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Execute SQL view with batch processing for large datasets
   */
  async executeViewWithBatching(
    sqlViewId: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<{ data: unknown[]; headers: string[]; executionTime: number; totalRows: number; batches: number }> {
    const startTime = Date.now();
    const batchSize = options.pageSize || 1000; // Default 1000 rows per batch
    let allData: unknown[] = [];
    let headers: string[] = [];
    let page = 1;
    let totalRows = 0;
    let batches = 0;
    let hasMore = true;

    try {
      console.log(`📦 Starting batch processing for SQL view: ${sqlViewId} (batch size: ${batchSize})`);

      // Step 1: Execute/refresh the materialized view first
      try {
        console.log('⚡ Executing materialized view...');
        await this.client.axiosInstance.post(`/sqlViews/${sqlViewId}/execute`);
        console.log('✅ Materialized view executed successfully');
      } catch (executeError) {
        console.warn('⚠️ View execution failed, continuing with data fetch:', executeError);
      }

      while (hasMore) {
        console.log(`📄 Fetching batch ${page} (rows ${(page - 1) * batchSize + 1}-${page * batchSize})`);
        
        const batchOptions = {
          ...options,
          page,
          pageSize: batchSize
        };

        const url = this.buildExecutionUrl(sqlViewId, batchOptions);
        const response = await this.client.axiosInstance.get(url);
        
        if (response.data) {
          let batchData: unknown[] = [];
          let batchHeaders: string[] = [];

          // Handle DHIS2 response formats
          if (response.data.listGrid) {
            const listGrid = response.data.listGrid;
            batchData = listGrid.rows || [];
            
            // Extract headers from listGrid.headers array
            if (listGrid.headers && Array.isArray(listGrid.headers)) {
              batchHeaders = listGrid.headers.map((header: any) => header.name || header.column || '');
            }
          }
          // DHIS2 standard format
          else if (Array.isArray(response.data.rows)) {
            batchData = response.data.rows;
            batchHeaders = response.data.headers || [];
          } else if (Array.isArray(response.data)) {
            batchData = response.data;
            batchHeaders = batchData.length > 0 ? Object.keys(batchData[0] as object) : [];
          } else if (response.data.data && Array.isArray(response.data.data)) {
            batchData = response.data.data;
            batchHeaders = response.data.headers || (batchData.length > 0 ? Object.keys(batchData[0] as object) : []);
          }

          // Set headers from first batch
          if (headers.length === 0 && batchHeaders.length > 0) {
            headers = batchHeaders;
          }

          // Add batch data to total
          allData.push(...batchData);
          totalRows += batchData.length;
          batches++;

          console.log(`✅ Batch ${page}: ${batchData.length} rows retrieved (total: ${totalRows})`);

          // Check if we should continue
          if (batchData.length < batchSize) {
            hasMore = false;
            console.log('📊 Reached end of data (batch smaller than requested size)');
          } else if (options.maxRows && totalRows >= options.maxRows) {
            hasMore = false;
            console.log(`📊 Reached maximum row limit: ${options.maxRows}`);
          } else {
            page++;
            
            // Add delay between batches to avoid overwhelming the server
            if (batches % 5 === 0) {
              console.log('⏳ Pausing between batches...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          hasMore = false;
          console.log('❌ No data in response, stopping batch processing');
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`🎉 Batch processing completed: ${totalRows} total rows in ${batches} batches (${executionTime}ms)`);

      return { 
        data: allData, 
        headers, 
        executionTime, 
        totalRows,
        batches
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Batch processing failed:', error);
      
      // Return partial data if we got some
      if (allData.length > 0) {
        console.log(`⚠️ Returning partial data: ${allData.length} rows from ${batches} completed batches`);
        return {
          data: allData,
          headers,
          executionTime,
          totalRows: allData.length,
          batches
        };
      }

      throw new Error(`Batch processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test SQL view accessibility and return metadata
   */
  async testSqlViewAccess(sqlViewId: string): Promise<{ accessible: boolean; metadata?: any; error?: string }> {
    try {
      console.log('🧪 Testing SQL view access:', sqlViewId);
      
      // Try to get metadata first
      const metadata = await this.getSqlViewMetadata(sqlViewId);
      
      // Try to execute if it's a materialized view
      if (metadata && (metadata as any).type === 'MATERIALIZED_VIEW') {
        try {
          await this.client.axiosInstance.post(`/sqlViews/${sqlViewId}/execute`);
        } catch (execError) {
          console.warn('⚠️ Execution test failed:', execError);
        }
      }
      
      return { accessible: true, metadata };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ SQL view access test failed:', errorMessage);
      return { accessible: false, error: errorMessage };
    }
  }
}