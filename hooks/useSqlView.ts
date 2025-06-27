// hooks/useSqlView.ts
import { useState, useCallback, useEffect } from 'react';
import { SqlViewService, SqlViewExecutionOptions, SqlViewExecutionResult } from '../lib/services/sqlViewService';
import { SqlViewCacheEntry, useSqlViewCacheStore } from '../lib/stores/sqlViewCacheStore';
import { useAuthStore } from '../lib/stores/authStore';

export interface UseSqlViewOptions {
  sqlViewId: string;
  autoExecute?: boolean;
  defaultOptions?: SqlViewExecutionOptions;
}

export interface UseSqlViewReturn {
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
  cancel: () => void;
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const { isAuthenticated, dhisBaseUrl, authToken } = useAuthStore();
  const { getEntriesForView, removeEntry } = useSqlViewCacheStore();
  
  // Get cached entries for this SQL view
  const cachedEntries = getEntriesForView(sqlViewId);
  
  // Create service instance
  const createService = useCallback(() => {
    if (!isAuthenticated || !dhisBaseUrl || !authToken) throw new Error('Not authenticated');
    return new SqlViewService(dhisBaseUrl, authToken, 'local-session');
  }, [isAuthenticated, dhisBaseUrl, authToken]);
  
  // Execute SQL view
  const execute = useCallback(async (options: SqlViewExecutionOptions = {}) => {
    // Cancel any existing request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);
    
    setLoading(true);
    setError(null);
    
    try {
      const service = createService();
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Check if the request was aborted before starting
      if (newAbortController.signal.aborted) {
        throw new Error('Request was cancelled');
      }
      
      const result = await service.executeView(sqlViewId, mergedOptions);
      
      // Check if the request was aborted before setting results
      if (newAbortController.signal.aborted) {
        throw new Error('Request was cancelled');
      }
      
      setData(result.data as Record<string, unknown>[]);
      setHeaders(result.headers);
      setMetadata(result.metadata);
    } catch (err) {
      // Don't set error if the request was cancelled
      if (err instanceof Error && err.message === 'Request was cancelled') {
        console.log('🛑 SQL View request was cancelled');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('SQL View execution error:', err);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, [sqlViewId, defaultOptions, createService, abortController]);
  
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
        'default-template', // templateId
        data,
        headers,
        {
          ...defaultOptions
        },
        metadata?.executionTime || 0, // executionTime
        name
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
    const entries = service.getCachedExecutionsForView(sqlViewId);
    const entry = entries.find(e => e.id === cacheId);
    
    if (entry) {
      setData(entry.data as Record<string, unknown>[]);
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
  
  // Cancel ongoing execution
  const cancel = useCallback(() => {
    if (abortController) {
      console.log('🛑 Cancelling SQL View execution');
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
  }, [abortController]);

  // Refresh - re-execute with cache disabled
  const refresh = useCallback(async () => {
    await execute({ ...defaultOptions, useCache: false });
  }, [execute, defaultOptions]);
  
  // Auto-execute on mount if enabled
  useEffect(() => {
    if (autoExecute && isAuthenticated) {
      execute();
    }
  }, [autoExecute, isAuthenticated, execute]);
  
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
    refresh,
    cancel
  };
}