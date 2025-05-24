import { DHIS2Client } from '../dhis2';

export interface SqlViewCacheEntry {
  id: string;
  sqlViewId: string;
  templateId: string;
  data: any[];
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
}

export interface SqlViewExecutionResult {
  data: any[];
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
  data: any[];
  metadata: {
    columns: string[];
    rowCount: number;
    executionTime: number;
    cached: boolean;
    cacheId?: string;
  };
}

export class SqlViewService {
  private client: DHIS2Client;
  private cacheStore: Map<string, SqlViewCacheEntry> = new Map();
  private readonly CACHE_KEY_PREFIX = 'sqlview_cache_';
  private authToken: string | null = null;
  private sessionId: string | null = null;

  constructor(baseUrl?: string, auth?: string, sessionId?: string) {
    this.client = new DHIS2Client(baseUrl || '', auth);
    this.authToken = auth || null;
    this.sessionId = sessionId || null;
    this.loadCacheFromStorage();
  }

  // Enhanced execute method with dynamic parameters and caching
  async executeView(
    sqlViewId: string,
    options: SqlViewExecutionOptions = {}
  ): Promise<SqlViewExecutionResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(sqlViewId, options);
    
    // Check cache first if enabled and not explicitly disabled
    if (options.cache !== false && options.useCache !== false) {
      const cachedEntry = this.getCachedEntry(cacheKey);
      if (cachedEntry && this.isCacheValid(cachedEntry)) {
        console.log('📦 Using cached data for', sqlViewId);
        return {
          data: cachedEntry.data,
          headers: cachedEntry.headers || Object.keys(cachedEntry.data[0] || {}),
          metadata: {
            columns: Object.keys(cachedEntry.data[0] || {}),
            rowCount: cachedEntry.data.length,
            executionTime: 0,
            cached: true,
            cacheId: cachedEntry.id,
            sqlViewId,
            parameters: options.parameters,
            filters: options.filters
          }
        };
      }
    }

    // Build execution URL and use proxy endpoint
    const sqlViewPath = this.buildExecutionUrl(sqlViewId, options);
    let proxyUrl = `/api/dhis2/proxy?path=${encodeURIComponent(sqlViewPath)}`;
    
    // Add sessionId parameter if available
    if (this.sessionId) {
      proxyUrl += `&sessionId=${encodeURIComponent(this.sessionId)}`;
    }
    
    let data: any[] = [];
    let headers: string[] = [];
    
    try {
      // Prepare request options with authentication
      const requestOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add authentication header if available
      if (this.authToken) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': `Basic ${this.authToken}`
        };
      }

      const response = await fetch(proxyUrl, requestOptions);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      console.log('🔍 SQL View Raw Response:', JSON.stringify(responseData, null, 2));
      
      // Handle DHIS2 listGrid format specifically
      if (responseData.listGrid) {
        const { listGrid } = responseData;
        
        console.log('📊 ListGrid Headers:', listGrid.headers);
        console.log('📊 ListGrid Rows (first 2):', listGrid.rows?.slice(0, 2));
        
        // Extract headers from listGrid.headers
        if (listGrid.headers && Array.isArray(listGrid.headers)) {
          headers = listGrid.headers.map((header: any, index: number) => {
            const headerName = header.name || header.column || header.displayName || `Column_${index}`;
            console.log(`📝 Header ${index}:`, header, '→', headerName);
            return headerName;
          });
        }
        
        console.log('🏷️ Final Headers:', headers);
        
        // Convert rows to objects using headers
        if (listGrid.rows && Array.isArray(listGrid.rows)) {
          data = listGrid.rows.map((row: any[], rowIndex: number) => {
            const obj: any = {};
            headers.forEach((headerName, index) => {
              obj[headerName] = row[index] !== undefined ? row[index] : null;
            });
            if (rowIndex < 2) {
              console.log(`📋 Processed Row ${rowIndex}:`, obj);
            }
            return obj;
          });
        }
      } else if (responseData.rows && responseData.headers) {
        // Alternative format (rows/headers at root)
        headers = responseData.headers.map((header: any) => header.name || header.column || '');
        data = responseData.rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((headerName, index) => {
            obj[headerName] = row[index] !== undefined ? row[index] : null;
          });
          return obj;
        });
      } else if (Array.isArray(responseData)) {
        // Direct array response
        data = responseData;
        headers = data.length > 0 ? Object.keys(data[0]) : [];
      } else {
        // Fallback: treat as single object or empty
        data = responseData ? [responseData] : [];
        headers = data.length > 0 ? Object.keys(data[0]) : [];
      }
    } catch (error: any) {
      throw new Error(`Failed to execute SQL view: ${error.message}`);
    }

    const executionTime = Date.now() - startTime;
    
    // Cache the result if caching is enabled
    if (options.cache !== false && data.length > 0) {
      const cacheEntry = this.createCacheEntry(
        sqlViewId,
        data,
        options,
        executionTime
      );
      this.setCacheEntry(cacheEntry);
    }
    
    return {
      data,
      headers,
      metadata: {
        columns: headers,
        rowCount: data.length,
        executionTime,
        cached: false,
        cacheId: options.cache !== false ? cacheKey : undefined,
        sqlViewId,
        parameters: options.parameters,
        filters: options.filters
      }
    };
  }

  // Execute with variable substitution (for query-type SQL views)
  async executeQueryView(
    sqlViewId: string,
    variables: Record<string, string>,
    options: SqlViewExecutionOptions = {}
  ): Promise<DynamicSqlViewResponse> {
    const enhancedOptions = {
      ...options,
      parameters: { ...options.parameters, ...this.formatVariables(variables) }
    };
    return this.executeView(sqlViewId, enhancedOptions);
  }

  // Build dynamic execution URL with parameters and filters
  private buildExecutionUrl(sqlViewId: string, options: SqlViewExecutionOptions): string {
    let url = `/sqlViews/${sqlViewId}/data.${options.format || 'json'}`;
    const params = new URLSearchParams();

    // Add variable parameters
    if (options.parameters) {
      Object.entries(options.parameters).forEach(([key, value]) => {
        params.append(`var`, `${key}:${value}`);
      });
    }

    // Add filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        params.append('filter', `${key}:${value}`);
      });
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  // Format variables for DHIS2 SQL view variable substitution
  private formatVariables(variables: Record<string, string>): Record<string, string> {
    const formatted: Record<string, string> = {};
    Object.entries(variables).forEach(([key, value]) => {
      // DHIS2 expects variables without ${} wrapper in API calls
      const cleanKey = key.replace(/^\$\{|\}$/g, '');
      formatted[cleanKey] = value;
    });
    return formatted;
  }

  // Cache management methods
  private generateCacheKey(sqlViewId: string, options: SqlViewExecutionOptions): string {
    const params = JSON.stringify(options.parameters || {});
    const filters = JSON.stringify(options.filters || {});
    return `${this.CACHE_KEY_PREFIX}${sqlViewId}_${params}_${filters}`;
  }

  private createCacheEntry(
    sqlViewId: string,
    data: any[],
    options: SqlViewExecutionOptions,
    executionTime: number
  ): SqlViewCacheEntry {
    const now = new Date();
    const expiryMinutes = options.cacheExpiry || 60; // Default 1 hour
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);
    
    return {
      id: this.generateCacheKey(sqlViewId, options),
      sqlViewId,
      templateId: '', // Will be set by caller if needed
      data,
      parameters: options.parameters,
      filters: options.filters,
      createdAt: now,
      expiresAt,
      name: options.cacheName || `Cache: ${sqlViewId} ${now.toLocaleString()}`,
      userNotes: `Execution time: ${executionTime}ms`
    };
  }

  private setCacheEntry(entry: SqlViewCacheEntry): void {
    this.cacheStore.set(entry.id, entry);
    this.saveCacheToStorage();
  }

  getCachedEntry(key: string): SqlViewCacheEntry | undefined {
    return this.cacheStore.get(key);
  }

  private isCacheValid(entry: SqlViewCacheEntry): boolean {
    if (!entry.expiresAt) return true;
    return new Date() < new Date(entry.expiresAt);
  }

  // Get all cached entries for a specific SQL view
  getCachedEntriesForView(sqlViewId: string): SqlViewCacheEntry[] {
    const entries: SqlViewCacheEntry[] = [];
    this.cacheStore.forEach((entry) => {
      if (entry.sqlViewId === sqlViewId) {
        entries.push(entry);
      }
    });
    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Save a specific cache entry with custom name and notes
  saveCacheEntry(
    sqlViewId: string,
    data: any[],
    name: string,
    notes?: string,
    templateId?: string
  ): SqlViewCacheEntry {
    const entry: SqlViewCacheEntry = {
      id: `${this.CACHE_KEY_PREFIX}saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sqlViewId,
      templateId: templateId || '',
      data,
      createdAt: new Date(),
      name,
      userNotes: notes
    };
    
    this.setCacheEntry(entry);
    return entry;
  }

  // Delete a cached entry
  deleteCacheEntry(cacheId: string): boolean {
    const deleted = this.cacheStore.delete(cacheId);
    if (deleted) {
      this.saveCacheToStorage();
    }
    return deleted;
  }

  // Clear expired cache entries
  clearExpiredCache(): number {
    let cleared = 0;
    this.cacheStore.forEach((entry, key) => {
      if (!this.isCacheValid(entry)) {
        this.cacheStore.delete(key);
        cleared++;
      }
    });
    if (cleared > 0) {
      this.saveCacheToStorage();
    }
    return cleared;
  }

  // Clear ALL cache entries (for debugging)
  clearAllCache(): void {
    console.log('🧹 Clearing all SQL View cache entries');
    this.cacheStore.clear();
    this.saveCacheToStorage();
    
    // Also clear browser storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sqlViewCache');
      localStorage.removeItem('sql-view-cache');
      console.log('🧹 Cleared browser storage cache');
    }
  }

  // Persistence methods
  private saveCacheToStorage(): void {
    try {
      const cacheData = Array.from(this.cacheStore.entries());
      const serialized = JSON.stringify(cacheData);
      if (typeof window !== 'undefined') {
        // Using IndexedDB would be better for large datasets
        // This is a simplified version using sessionStorage
        sessionStorage.setItem('sqlViewCache', serialized);
      }
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private loadCacheFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const serialized = sessionStorage.getItem('sqlViewCache');
        if (serialized) {
          const cacheData = JSON.parse(serialized);
          this.cacheStore = new Map(cacheData);
        }
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  // Materialized view management
  async refreshMaterializedView(sqlViewId: string): Promise<void> {
    await (this.client as any).axiosInstance.post(`/sqlViews/${sqlViewId}/execute`);
  }

  // Get SQL view metadata including variables
  async getSqlViewMetadata(sqlViewId: string): Promise<any> {
    const sqlViewPath = `/sqlViews/${sqlViewId}?fields=*`;
    let proxyUrl = `/api/dhis2/proxy?path=${encodeURIComponent(sqlViewPath)}`;
    
    // Add sessionId parameter if available
    if (this.sessionId) {
      proxyUrl += `&sessionId=${encodeURIComponent(this.sessionId)}`;
    }
    
    console.log('Fetching SQL view metadata from:', proxyUrl);
    
    // Prepare request options with authentication
    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add authentication header if available
    if (this.authToken) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Authorization': `Basic ${this.authToken}`
      };
    }

    const response = await fetch(proxyUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`Failed to get SQL view metadata: ${response.statusText}`);
    }
    return await response.json();
  }

  // Discover SQL view variables from the SQL query
  extractVariables(sqlQuery: string): string[] {
    const variablePattern = /\$\{(\w+)\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variablePattern.exec(sqlQuery)) !== null) {
      variables.push(match[1]);
    }
    
    return variables;
  }

  // Validate a SQL view connection
  async validateView(uid: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await (this.client as any).axiosInstance.get(`/sqlViews/${uid}`);
      if (response.data) {
        return { isValid: true };
      }
      return { isValid: false, error: 'SQL view not found' };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.message || 'Failed to validate SQL view' 
      };
    }
  }

  // Create a new SQL view
  async createSqlView(payload: {
    name: string;
    description?: string;
    sqlQuery: string;
    type: string;
    cacheStrategy: string;
  }): Promise<{ uid: string }> {
    try {
      const response = await (this.client as any).axiosInstance.post('/sqlViews', payload);
      return { uid: response.data.response.uid };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create SQL view');
    }
  }

  // Save execution to cache (hook expects this)
  async saveExecutionToCache(
    sqlViewId: string,
    data: any[],
    headers: string[],
    name: string,
    options: Partial<SqlViewExecutionOptions & { userNotes?: string }> = {}
  ): Promise<string> {
    const entry: SqlViewCacheEntry = {
      id: `${this.CACHE_KEY_PREFIX}saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sqlViewId,
      templateId: '',
      data,
      headers,
      parameters: options.parameters,
      filters: options.filters,
      createdAt: new Date(),
      name,
      userNotes: options.userNotes,
      rowCount: data.length,
      executionTime: 0,
      expiresAt: options.cacheExpiry ? new Date(Date.now() + options.cacheExpiry * 60000) : undefined
    };
    
    this.setCacheEntry(entry);
    return entry.id;
  }
}

export const sqlViewService = new SqlViewService();