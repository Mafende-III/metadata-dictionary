import { SqlViewCacheEntry } from './sqlViewServiceLegacy';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Memory-optimized cache service with size limits and LRU eviction
 */
export class OptimizedCacheService {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private maxMemoryMB: number;
  private maxMemoryBytes: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 500, maxMemoryMB = 100) {
    this.maxEntries = maxEntries;
    this.maxMemoryMB = maxMemoryMB;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Calculate approximate size of an object in bytes
   */
  private calculateSize(obj: unknown): number {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Enforce memory and entry limits using LRU eviction
   */
  private enforceMemoryLimits(): void {
    // Sort entries by access pattern (LRU)
    const sortedEntries = Array.from(this.cache.entries()).sort((a, b) => {
      // Prioritize by last accessed time and access count
      const scoreA = a[1].lastAccessed * Math.log(a[1].accessCount + 1);
      const scoreB = b[1].lastAccessed * Math.log(b[1].accessCount + 1);
      return scoreA - scoreB;
    });

    // Remove entries until we're under limits
    while (
      (this.cache.size > this.maxEntries || 
       this.getCurrentMemoryUsage() > this.maxMemoryBytes) &&
      sortedEntries.length > 0
    ) {
      const [keyToRemove] = sortedEntries.shift()!;
      this.cache.delete(keyToRemove);
      console.debug(`Cache: Evicted entry ${keyToRemove} (LRU)`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // Consider entries older than 1 hour as expired
      if (now - entry.timestamp > 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      console.debug(`Cache: Expired entry ${key}`);
    });
    
    if (expiredKeys.length > 0) {
      console.debug(`Cache: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Set cache entry with memory management
   */
  set<T>(key: string, data: T): void {
    const now = Date.now();
    const size = this.calculateSize(data);
    
    // Don't cache extremely large objects (>10MB)
    if (size > 10 * 1024 * 1024) {
      console.warn(`Cache: Skipping large object (${Math.round(size / 1024 / 1024)}MB): ${key}`);
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.enforceMemoryLimits();
    
    console.debug(`Cache: Set ${key} (${Math.round(size / 1024)}KB)`);
  }

  /**
   * Get cache entry with access tracking
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;
    
    console.debug(`Cache: Hit ${key} (access count: ${entry.accessCount})`);
    return entry.data;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.debug(`Cache: Deleted ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.debug(`Cache: Cleared all entries (${count} removed)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const memoryUsage = this.getCurrentMemoryUsage();

    return {
      totalSize: this.cache.size,
      entryCount: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: Math.round(memoryUsage / 1024 / 1024 * 100) / 100 // MB
    };
  }

  /**
   * Get cache entries by pattern
   */
  getEntriesByPattern(pattern: RegExp): string[] {
    return Array.from(this.cache.keys()).filter(key => pattern.test(key));
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    const keys = this.getEntriesByPattern(pattern);
    keys.forEach(key => this.cache.delete(key));
    console.debug(`Cache: Invalidated ${keys.length} entries matching pattern`);
    return keys.length;
  }

  /**
   * Preload data into cache
   */
  preload<T>(key: string, dataLoader: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    return dataLoader().then(data => {
      this.set(key, data);
      return data;
    });
  }

  /**
   * Batch operations for efficiency
   */
  setMultiple<T>(entries: Array<{ key: string; data: T }>): void {
    entries.forEach(({ key, data }) => {
      this.set(key, data);
    });
  }

  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    keys.forEach(key => {
      results.set(key, this.get<T>(key));
    });
    return results;
  }
}

// Singleton instance for global use
export const globalCache = new OptimizedCacheService(1000, 200); // 1000 entries, 200MB limit

// Specialized cache for SQL view data
export const sqlViewCache = new OptimizedCacheService(200, 50); // 200 entries, 50MB limit

// Specialized cache for metadata
export const metadataCache = new OptimizedCacheService(500, 100); // 500 entries, 100MB limit