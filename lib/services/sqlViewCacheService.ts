import { SqlViewCacheEntry, SqlViewExecutionOptions } from './sqlViewServiceLegacy';

/**
 * Dedicated service for SQL View caching operations
 * Handles cache storage, retrieval, validation, and persistence
 */
export class SqlViewCacheService {
  private cacheStore: Map<string, SqlViewCacheEntry> = new Map();
  private readonly CACHE_KEY_PREFIX = 'sqlview_cache_';
  private readonly DEFAULT_CACHE_EXPIRY_MINUTES = 60;

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Generate cache key for SQL view execution
   */
  generateCacheKey(sqlViewId: string, options: SqlViewExecutionOptions): string {
    const optionsStr = JSON.stringify({
      parameters: options.parameters || {},
      filters: options.filters || {}
    });
    return `${sqlViewId}_${btoa(optionsStr)}`;
  }

  /**
   * Create cache entry from execution results
   */
  createCacheEntry(
    sqlViewId: string,
    templateId: string,
    data: unknown[],
    headers: string[],
    options: SqlViewExecutionOptions,
    executionTime: number,
    name?: string
  ): SqlViewCacheEntry {
    const now = new Date();
    const expiryMinutes = options.cacheExpiry || this.DEFAULT_CACHE_EXPIRY_MINUTES;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    return {
      id: this.generateCacheKey(sqlViewId, options),
      sqlViewId,
      templateId,
      data,
      headers,
      parameters: options.parameters,
      filters: options.filters,
      createdAt: now,
      expiresAt,
      name: name || `SQL View ${sqlViewId}`,
      rowCount: data.length,
      executionTime
    };
  }

  /**
   * Store cache entry
   */
  setCacheEntry(entry: SqlViewCacheEntry): void {
    this.cacheStore.set(entry.id, entry);
    this.saveCacheToStorage();
    console.log('💾 Cached SQL view data:', entry.id);
  }

  /**
   * Retrieve cache entry by key
   */
  getCachedEntry(cacheKey: string): SqlViewCacheEntry | null {
    return this.cacheStore.get(cacheKey) || null;
  }

  /**
   * Check if cache entry is still valid
   */
  isCacheValid(entry: SqlViewCacheEntry): boolean {
    if (!entry.expiresAt) {
      return true; // No expiry set, considered valid
    }
    
    const now = new Date();
    const isValid = now < entry.expiresAt;
    
    if (!isValid) {
      console.log('⏰ Cache expired for:', entry.id);
      this.cacheStore.delete(entry.id);
      this.saveCacheToStorage();
    }
    
    return isValid;
  }

  /**
   * Get all cached entries
   */
  getAllCachedEntries(): SqlViewCacheEntry[] {
    return Array.from(this.cacheStore.values());
  }

  /**
   * Get cached entries for specific SQL view
   */
  getCachedEntriesForView(sqlViewId: string): SqlViewCacheEntry[] {
    return this.getAllCachedEntries().filter(entry => entry.sqlViewId === sqlViewId);
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(cacheKey: string): boolean {
    const deleted = this.cacheStore.delete(cacheKey);
    if (deleted) {
      this.saveCacheToStorage();
      console.log('🗑️ Cleared cache:', cacheKey);
    }
    return deleted;
  }

  /**
   * Clear all cache entries for specific SQL view
   */
  clearCacheForView(sqlViewId: string): number {
    const entries = this.getCachedEntriesForView(sqlViewId);
    let cleared = 0;
    
    entries.forEach(entry => {
      if (this.cacheStore.delete(entry.id)) {
        cleared++;
      }
    });
    
    if (cleared > 0) {
      this.saveCacheToStorage();
      console.log(`🗑️ Cleared ${cleared} cache entries for view:`, sqlViewId);
    }
    
    return cleared;
  }

  /**
   * Clear all expired cache entries
   */
  clearExpiredEntries(): number {
    const allEntries = this.getAllCachedEntries();
    let cleared = 0;
    
    allEntries.forEach(entry => {
      if (!this.isCacheValid(entry)) {
        cleared++;
      }
    });
    
    console.log(`🧹 Cleared ${cleared} expired cache entries`);
    return cleared;
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    const count = this.cacheStore.size;
    this.cacheStore.clear();
    this.saveCacheToStorage();
    console.log(`🗑️ Cleared all cache (${count} entries)`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    totalSizeKB: number;
  } {
    const allEntries = this.getAllCachedEntries();
    const validEntries = allEntries.filter(entry => this.isCacheValid(entry));
    const expiredEntries = allEntries.length - validEntries.length;
    
    // Estimate size (rough calculation)
    const totalSize = JSON.stringify(allEntries).length;
    const totalSizeKB = Math.round(totalSize / 1024);
    
    return {
      totalEntries: allEntries.length,
      validEntries: validEntries.length,
      expiredEntries,
      totalSizeKB
    };
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      const cacheData = Array.from(this.cacheStore.entries());
      const serialized = JSON.stringify(cacheData);
      
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('sqlViewCache', serialized);
      }
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = sessionStorage.getItem('sqlViewCache');
        if (cached) {
          const cacheData = JSON.parse(cached) as [string, SqlViewCacheEntry][];
          this.cacheStore = new Map(cacheData.map(([key, entry]) => [
            key,
            {
              ...entry,
              createdAt: new Date(entry.createdAt),
              expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : undefined
            }
          ]));
          
          console.log(`📦 Loaded ${this.cacheStore.size} cache entries from storage`);
          
          // Clean up expired entries on load
          this.clearExpiredEntries();
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.cacheStore.clear();
    }
  }
}