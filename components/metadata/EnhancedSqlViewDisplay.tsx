import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, Save, RefreshCw, Clock, Database, Trash2, Play, History } from 'lucide-react';
import { useSqlView } from '../../hooks/useSqlView';
import { SqlViewCacheEntry } from '../../lib/stores/sqlViewCacheStore';

// Types
interface SqlViewVariable {
  name: string;
  value: string;
  description?: string;
}

interface EnhancedSqlViewDisplayProps {
  sqlViewId: string;
  title?: string;
  variables?: SqlViewVariable[];
  defaultCacheExpiry?: number;
  autoExecute?: boolean;
}

export default function EnhancedSqlViewDisplay({
  sqlViewId,
  title = 'Dynamic SQL View Executor',
  variables = [],
  defaultCacheExpiry = 60,
  autoExecute = false
}: EnhancedSqlViewDisplayProps) {
  const [localVariables, setLocalVariables] = useState<SqlViewVariable[]>(variables);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheExpiry, setCacheExpiry] = useState(defaultCacheExpiry);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCacheHistory, setShowCacheHistory] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Use the SQL View hook
  const {
    data,
    headers,
    loading,
    error,
    metadata,
    cachedEntries,
    execute,
    saveToCache,
    loadFromCache,
    deleteFromCache,
    exportData,
    clearError,
    refresh
  } = useSqlView({
    sqlViewId,
    autoExecute,
    defaultOptions: {
      useCache: cacheEnabled,
      cacheExpiry,
    }
  });

  // Update variables when prop changes
  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  // Execute SQL View with current parameters
  const executeView = async () => {
    const parameters = localVariables.reduce((acc, v) => {
      if (v.value) acc[v.name] = v.value;
      return acc;
    }, {} as Record<string, string>);

    await execute({
      parameters,
      filters,
      useCache: cacheEnabled,
      cacheExpiry
    });
  };

  // Save current data to cache
  const handleSaveToCache = async (name: string, notes: string) => {
    const cacheId = await saveToCache(name, notes);
    if (cacheId) {
      setShowSaveDialog(false);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">Execute and cache SQL views with dynamic parameters</p>
          </div>
          <button
            onClick={() => setShowCacheHistory(!showCacheHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            <History className="w-4 h-4" />
            Cache History ({cachedEntries.length})
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Variables Section */}
        {localVariables.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Dynamic Variables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localVariables.map((variable, index) => (
                <div key={variable.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    ${`{${variable.name}}`}
                    {variable.description && (
                      <span className="text-gray-500 ml-2 text-xs">{variable.description}</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={variable.value}
                    onChange={(e) => {
                      const newVars = [...localVariables];
                      newVars[index].value = e.target.value;
                      setLocalVariables(newVars);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter ${variable.name}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cache Settings */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cacheEnabled}
                  onChange={(e) => setCacheEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Caching</span>
              </label>
              {cacheEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Expire after:</label>
                  <input
                    type="number"
                    value={cacheExpiry}
                    onChange={(e) => setCacheExpiry(parseInt(e.target.value) || 60)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    min="1"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={executeView}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute View
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Metadata Display */}
        {metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Rows:</span>
              <p className="font-semibold">{metadata.rowCount}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Execution Time:</span>
              <p className="font-semibold">{metadata.executionTime}ms</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <p className="font-semibold flex items-center gap-1">
                {metadata.cached ? (
                  <>
                    <Database className="w-4 h-4 text-green-600" />
                    Cached
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Fresh
                  </>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Columns:</span>
              <p className="font-semibold">{headers.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cache History Panel */}
      {showCacheHistory && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Saved Cache Entries</h3>
          <div className="space-y-3">
            {cachedEntries.map((entry: SqlViewCacheEntry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium">{entry.name}</h4>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(entry.createdAt).toLocaleString()}
                    {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                      <span className="ml-2">
                        • Parameters: {Object.entries(entry.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </span>
                    )}
                  </p>
                  {entry.userNotes && <p className="text-sm text-gray-500 mt-1">{entry.userNotes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadFromCache(entry.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Database className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportData('csv')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteFromCache(entry.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {cachedEntries.length === 0 && (
              <p className="text-gray-500 text-center py-4">No cached entries found</p>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                Save Cache
              </button>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((row, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50">
                      {headers.map((column) => (
                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof row[column] === 'boolean' ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              row[column] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {row[column] ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            String(row[column] || '-')
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedRows.has(index) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(index) && (
                      <tr>
                        <td colSpan={headers.length + 1} className="px-6 py-4 bg-gray-50">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(row, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {data.length > 10 && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              Showing first 10 of {data.length} rows
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Cache Entry</h3>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cache Name
                </label>
                <input
                  type="text"
                  id="cache-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Morning Report Data"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="cache-notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this cache..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const nameInput = document.getElementById('cache-name') as HTMLInputElement;
                    const notesInput = document.getElementById('cache-notes') as HTMLTextAreaElement;
                    if (nameInput.value) {
                      handleSaveToCache(nameInput.value, notesInput.value);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 