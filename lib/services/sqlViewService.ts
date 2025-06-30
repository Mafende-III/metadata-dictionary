import { DHIS2Client } from '../dhis2';
import { SqlViewCacheService } from './sqlViewCacheService';
import { SqlViewApiService } from './sqlViewApiService';
import { SqlViewTransformService } from './sqlViewTransformService';

// Re-export types for backward compatibility
export interface SqlViewCacheEntry {
  id: string;
  sqlViewId: string;
  templateId: string;
  data: unknown[];
  headers?: string[];
  parameters?: Record<string, string>;
  filters?: Record<string, string>;
  createdAt: Date;
  expiresAt?: Date;
  userNotes?: string;
  name: string;
  rowCount?: number;
  executionTime?: number;
}

export interface SqlViewExecutionOptions {
  parameters?: Record<string, string>;
  filters?: Record<string, string>;
  format?: 'json' | 'csv' | 'xml' | 'xls' | 'html';
  cache?: boolean;
  useCache?: boolean;
  cacheExpiry?: number; // minutes
  cacheName?: string;
  // Pagination options
  page?: number;
  pageSize?: number;
  // Batch processing options
  maxRows?: number; // Maximum total rows to retrieve
  batchSize?: number; // Rows per batch (alias for pageSize)
}

export interface SqlViewExecutionResult {
  data: unknown[];
  headers: string[];
  metadata: {
    columns: string[];
    rowCount: number;
    executionTime: number;
    cached: boolean;
    cacheId?: string;
    sqlViewId: string;
    parameters?: Record<string, string>;
    filters?: Record<string, string>;
  };
}

export interface DynamicSqlViewResponse {
  data: unknown[];
  metadata: {
    columns: string[];
    rowCount: number;
    executionTime: number;
    cached: boolean;
    cacheId?: string;
    sqlViewId?: string;
    parameters?: Record<string, string>;
    filters?: Record<string, string>;
  };
}

/**
 * Refactored SQL View Service - orchestrates specialized services
 * This is the main service that clients should use for SQL view operations
 */
export class SqlViewService {
  private cacheService: SqlViewCacheService;
  private apiService: SqlViewApiService;
  private sessionId: string | null = null;

  constructor(
    baseUrl?: string, 
    usernameOrAuth?: string, 
    password?: string,
    options?: { allowSelfSignedCerts?: boolean }
  ) {
    let client: DHIS2Client;
    
    if (password) {
      // Username and password provided separately
      client = new DHIS2Client(baseUrl || '', undefined, options);
      client.setCredentials(usernameOrAuth || '', password);
      console.log('🔐 SQL View Service initialized with username/password auth');
    } else {
      // Auth token or base64 encoded credentials provided
      client = new DHIS2Client(baseUrl || '', usernameOrAuth, options);
      console.log('🔐 SQL View Service initialized with token auth');
    }
    
    this.cacheService = new SqlViewCacheService();
    this.apiService = new SqlViewApiService(client);
    this.sessionId = null;
  }

  /**
   * Execute SQL view with caching support
   */
  async executeView(
    sqlViewId: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<SqlViewExecutionResult> {
    const cacheKey = this.cacheService.generateCacheKey(sqlViewId, options);
    
    // Check cache first if enabled
    if (options.cache !== false && options.useCache !== false) {
      const cachedEntry = this.cacheService.getCachedEntry(cacheKey);
      if (cachedEntry && this.cacheService.isCacheValid(cachedEntry)) {
        console.log('📦 Using cached data for', sqlViewId);
        return {
          data: cachedEntry.data,
          headers: cachedEntry.headers || [],
          metadata: {
            columns: cachedEntry.headers || [],
            rowCount: cachedEntry.data.length,
            executionTime: cachedEntry.executionTime || 0,
            cached: true,
            cacheId: cachedEntry.id,
            sqlViewId,
            parameters: cachedEntry.parameters,
            filters: cachedEntry.filters,
          }
        };
      }
    }

    // Execute via API service
    const { data, headers, executionTime } = await this.apiService.executeView(sqlViewId, options);
    
    // Apply client-side filters if specified
    let processedData = SqlViewTransformService.transformToStructuredData(data, headers);
    if (options.filters) {
      processedData = SqlViewTransformService.applyFilters(processedData, options.filters);
    }

    // Cache the result if caching is enabled
    if (options.cache !== false) {
      const cacheEntry = this.cacheService.createCacheEntry(
        sqlViewId,
        'default', // templateId - could be passed as option
        processedData,
        headers,
        options,
        executionTime,
        options.cacheName
      );
      this.cacheService.setCacheEntry(cacheEntry);
    }

    return {
      data: processedData,
      headers,
      metadata: {
        columns: headers,
        rowCount: processedData.length,
        executionTime,
        cached: false,
        sqlViewId,
        parameters: options.parameters,
        filters: options.filters,
      }
    };
  }

  /**
   * Execute dynamic SQL query
   */
  async executeQueryView(
    query: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<DynamicSqlViewResponse> {
    const { data, headers, executionTime } = await this.apiService.executeQueryView(query, options);
    
    let processedData = SqlViewTransformService.transformToStructuredData(data, headers);
    if (options.filters) {
      processedData = SqlViewTransformService.applyFilters(processedData, options.filters);
    }

    return {
      data: processedData,
      metadata: {
        columns: headers,
        rowCount: processedData.length,
        executionTime,
        cached: false,
        parameters: options.parameters,
        filters: options.filters,
      }
    };
  }

  /**
   * Get SQL view metadata
   */
  async getSqlViewMetadata(sqlViewId: string): Promise<unknown> {
    return this.apiService.getSqlViewMetadata(sqlViewId);
  }

  /**
   * Validate SQL view
   */
  async validateView(uid: string): Promise<{ isValid: boolean; error?: string }> {
    return this.apiService.validateView(uid);
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
    return this.apiService.createSqlView(payload);
  }

  /**
   * Refresh materialized view
   */
  async refreshMaterializedView(sqlViewId: string): Promise<void> {
    return this.apiService.refreshMaterializedView(sqlViewId);
  }

  /**
   * Save execution result to cache manually
   */
  async saveExecutionToCache(
    sqlViewId: string,
    templateId: string,
    data: unknown[],
    headers: string[],
    options: SqlViewExecutionOptions,
    executionTime: number,
    name?: string
  ): Promise<string> {
    const cacheEntry = this.cacheService.createCacheEntry(
      sqlViewId,
      templateId,
      data,
      headers,
      options,
      executionTime,
      name
    );
    
    this.cacheService.setCacheEntry(cacheEntry);
    return cacheEntry.id;
  }

  /**
   * Get all cached executions
   */
  getAllCachedExecutions(): SqlViewCacheEntry[] {
    return this.cacheService.getAllCachedEntries();
  }

  /**
   * Get cached executions for specific view
   */
  getCachedExecutionsForView(sqlViewId: string): SqlViewCacheEntry[] {
    return this.cacheService.getCachedEntriesForView(sqlViewId);
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(cacheId: string): boolean {
    return this.cacheService.clearCacheEntry(cacheId);
  }

  /**
   * Clear all cache for specific view
   */
  clearCacheForView(sqlViewId: string): number {
    return this.cacheService.clearCacheForView(sqlViewId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cacheService.clearAllCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Transform and paginate data
   */
  transformAndPaginateData(
    data: unknown[],
    headers: string[],
    options: {
      filters?: Record<string, string>;
      sortColumn?: string;
      sortDirection?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    let processedData = SqlViewTransformService.transformToStructuredData(data, headers);
    
    // Apply filters
    if (options.filters) {
      processedData = SqlViewTransformService.applyFilters(processedData, options.filters);
    }
    
    // Apply sorting
    if (options.sortColumn) {
      processedData = SqlViewTransformService.sortData(
        processedData,
        options.sortColumn,
        options.sortDirection
      );
    }
    
    // Apply pagination
    if (options.page && options.pageSize) {
      return SqlViewTransformService.paginateData(processedData, options.page, options.pageSize);
    }
    
    return {
      data: processedData,
      pagination: {
        page: 1,
        pageSize: processedData.length,
        total: processedData.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  /**
   * Export data to CSV
   */
  exportToCSV(data: unknown[], headers: string[]): string {
    const structuredData = SqlViewTransformService.transformToStructuredData(data, headers);
    return SqlViewTransformService.convertToCSV(structuredData, headers);
  }

  /**
   * Get data summary
   */
  getDataSummary(data: unknown[], headers: string[]) {
    const structuredData = SqlViewTransformService.transformToStructuredData(data, headers);
    return SqlViewTransformService.getDataSummary(structuredData, headers);
  }

  /**
   * Detect column types
   */
  detectColumnTypes(data: unknown[], headers: string[]) {
    const structuredData = SqlViewTransformService.transformToStructuredData(data, headers);
    return SqlViewTransformService.detectColumnTypes(structuredData, headers);
  }

  /**
   * Execute SQL view with batch processing for large datasets
   */
  async executeViewWithBatching(
    sqlViewId: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<SqlViewExecutionResult & { totalRows: number; batches: number }> {
    const result = await this.apiService.executeViewWithBatching(sqlViewId, options);
    
    // Apply client-side filters if specified
    let processedData = SqlViewTransformService.transformToStructuredData(result.data, result.headers);
    if (options.filters) {
      processedData = SqlViewTransformService.applyFilters(processedData, options.filters);
    }

    // Cache the result if caching is enabled
    if (options.cache !== false) {
      const cacheEntry = this.cacheService.createCacheEntry(
        sqlViewId,
        'default',
        processedData,
        result.headers,
        options,
        result.executionTime,
        options.cacheName
      );
      this.cacheService.setCacheEntry(cacheEntry);
    }

    return {
      data: processedData,
      headers: result.headers,
      metadata: {
        columns: result.headers,
        rowCount: processedData.length,
        executionTime: result.executionTime,
        cached: false,
        sqlViewId,
        parameters: options.parameters,
        filters: options.filters,
      },
      totalRows: result.totalRows,
      batches: result.batches
    };
  }

  /**
   * Extract variables from SQL query
   * Looks for patterns like ${variableName} or :variableName
   */
  extractVariables(sqlQuery: string): string[] {
    if (!sqlQuery || typeof sqlQuery !== 'string') {
      return [];
    }

    const variables = new Set<string>();
    
    // Pattern 1: ${variableName} format
    const dollarPattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let match;
    while ((match = dollarPattern.exec(sqlQuery)) !== null) {
      variables.add(match[1]);
    }
    
    // Pattern 2: :variableName format
    const colonPattern = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = colonPattern.exec(sqlQuery)) !== null) {
      variables.add(match[1]);
    }
    
    // Pattern 3: {{variableName}} format (common in some SQL tools)
    const doubleBracePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    while ((match = doubleBracePattern.exec(sqlQuery)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables).sort();
  }
}