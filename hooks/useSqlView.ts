// hooks/useSqlView.ts
import { useState, useCallback, useEffect } from 'react';
import { SqlViewService, SqlViewExecutionOptions, SqlViewExecutionResult } from '../lib/services/sqlViewService';
import { SqlViewCacheEntry, useSqlViewCacheStore } from '../lib/stores/sqlViewCacheStore';
import { useDHIS2Auth } from './useDHIS2Auth';

interface UseSqlViewOptions {
  sqlViewId: string;
  autoExecute?: boolean;
  defaultOptions?: SqlViewExecutionOptions;
}

interface UseSqlViewReturn {
  // State
  data: Record<string, unknown>[];
  headers: string[];
  loading: boolean;
  error: string | null;
  metadata: SqlViewExecutionResult['metadata'] | null;
  
  // Cache state
  cachedEntries: SqlViewCacheEntry[];
  
  // Actions
  execute: (options?: SqlViewExecutionOptions) => Promise<void>;
  saveToCache: (name: string, userNotes?: string) => Promise<string | null>;
  loadFromCache: (cacheId: string) => void;
  deleteFromCache: (cacheId: string) => void;
  exportData: (format: 'csv' | 'json') => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useSqlView({ 
  sqlViewId, 
  autoExecute = false, 
  defaultOptions = {} 
}: UseSqlViewOptions): UseSqlViewReturn {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SqlViewExecutionResult['metadata'] | null>(null);
  
  const { session } = useDHIS2Auth();
  const { getEntriesForView, removeEntry } = useSqlViewCacheStore();
  
  // Get cached entries for this SQL view
  const cachedEntries = getEntriesForView(sqlViewId);
  
  // Create service instance
  const createService = useCallback(() => {
    if (!session) throw new Error('Not authenticated');
    return new SqlViewService(session.serverUrl, session.token, session.id);
  }, [session]);
  
  // Execute SQL view
  const execute = useCallback(async (options: SqlViewExecutionOptions = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const service = createService();
      const mergedOptions = { ...defaultOptions, ...options };
      const result = await service.executeView(sqlViewId, mergedOptions);
      
      setData(result.data);
      setHeaders(result.headers);
      setMetadata(result.metadata);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('SQL View execution error:', err);
    } finally {
      setLoading(false);
    }
  }, [sqlViewId, defaultOptions, createService]);
  
  // Save current data to cache
  const saveToCache = useCallback(async (name: string, userNotes?: string): Promise<string | null> => {
    if (data.length === 0) {
      setError('No data to save');
      return null;
    }
    
    try {
      const service = createService();
      const cacheId = await service.saveExecutionToCache(
        sqlViewId,
        data,
        headers,
        name,
        {
          ...defaultOptions,
          userNotes,
          cacheExpiry: defaultOptions.cacheExpiry || 60
        }
      );
      return cacheId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save cache';
      setError(errorMessage);
      return null;
    }
  }, [data, headers, sqlViewId, defaultOptions, createService]);
  
  // Load data from cache
  const loadFromCache = useCallback((cacheId: string) => {
    const service = createService();
    const entry = service.getCachedEntry(cacheId);
    
    if (entry) {
      setData(entry.data);
      setHeaders(entry.headers || []);
      setMetadata({
        columns: entry.headers || Object.keys(entry.data[0] || {}),
        rowCount: entry.rowCount || entry.data.length,
        executionTime: entry.executionTime || 0,
        cached: true,
        cacheId: entry.id,
        sqlViewId,
        parameters: entry.parameters,
        filters: entry.filters
      });
      setError(null);
    } else {
      setError('Cache entry not found');
    }
  }, [sqlViewId, createService]);
  
  // Delete from cache
  const deleteFromCache = useCallback((cacheId: string) => {
    removeEntry(cacheId);
  }, [removeEntry]);
  
  // Export data
  const exportData = useCallback((format: 'csv' | 'json' = 'csv') => {
    if (data.length === 0) {
      setError('No data to export');
      return;
    }
    
    try {
      if (format === 'csv') {
        const csv = [
          headers.join(','),
          ...data.map(row => 
            headers.map(h => `"${row[h] || ''}"`).join(',')
          )
        ].join('\n');
        
        downloadFile(csv, `sqlview_${sqlViewId}_${new Date().toISOString()}.csv`, 'text/csv');
      } else {
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `sqlview_${sqlViewId}_${new Date().toISOString()}.json`, 'application/json');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
    }
  }, [data, headers, sqlViewId]);
  
  // Helper function for downloads
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window === 'undefined') return;
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Refresh - re-execute with cache disabled
  const refresh = useCallback(async () => {
    await execute({ ...defaultOptions, useCache: false });
  }, [execute, defaultOptions]);
  
  // Auto-execute on mount if enabled
  useEffect(() => {
    if (autoExecute && session) {
      execute();
    }
  }, [autoExecute, session, execute]);
  
  return {
    // State
    data,
    headers,
    loading,
    error,
    metadata,
    cachedEntries,
    
    // Actions
    execute,
    saveToCache,
    loadFromCache,
    deleteFromCache,
    exportData,
    clearError,
    refresh
  };
}