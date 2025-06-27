'use client';

import { useState, useEffect } from 'react';
import { useSqlView } from '@/hooks/useSqlView';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAuthStore } from '@/lib/stores/authStore';
import SqlViewDataFilter from './SqlViewDataFilter';
import SqlViewParameterInput from './SqlViewParameterInput';
import SqlViewDataTable from './SqlViewDataTable';
import EnhancedSqlViewTable from './EnhancedSqlViewTable';
import QuickSqlViewSetup from './QuickSqlViewSetup';
import SqlViewDebugger from './SqlViewDebugger';
import DebugTableGenerator from './DebugTableGenerator';

interface SqlViewDataDisplayProps {
  templateId?: string;
  category?: string;
  filter?: Record<string, any>;
}

export default function SqlViewDataDisplay({ 
  templateId,
  category = 'data_elements',
  filter = {}
}: SqlViewDataDisplayProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(templateId);
  const [filters, setFilters] = useState<Record<string, any>>(filter);
  const [sqlViewParameters, setSqlViewParameters] = useState<Record<string, string>>({});
  const [sqlViewMetadata, setSqlViewMetadata] = useState<any>(null);
  const [debugTableData, setDebugTableData] = useState<any[]>([]);
  const [showDebugTable, setShowDebugTable] = useState<boolean>(false);
  const [debugMetadata, setDebugMetadata] = useState<any>(null);
  const [useDebugData, setUseDebugData] = useState<boolean>(false);

  const { templates, getTemplatesByCategory } = useAdminSqlViewStore();
  const { getViewUid, isViewConfigured } = useSqlViewStore();
  const { isAuthenticated, authToken, dhisBaseUrl } = useAuthStore();

  // Get available templates for the category
  const availableTemplates = getTemplatesByCategory(category);

  // Filter templates to only those that are configured (have actual DHIS2 SQL view UIDs)
  const configuredTemplates = availableTemplates.filter(template => 
    isViewConfigured(template.id)
  );

  // Get the actual DHIS2 SQL view UID for the selected template
  const actualSqlViewUid = selectedTemplateId ? getViewUid(selectedTemplateId) : '';

  // Use the enhanced SQL view hook with the actual UID
  const {
    data,
    headers,
    loading,
    error,
    metadata,
    execute,
    clearError
  } = useSqlView({
    sqlViewId: actualSqlViewUid || '',
    autoExecute: false,
    defaultOptions: {
      useCache: true,
      cacheExpiry: 30
    }
  });

  // Use effect to fetch metadata when templateId changes (but not data until user interaction)
  useEffect(() => {
    if (selectedTemplateId && actualSqlViewUid && isAuthenticated && authToken) {
      fetchSqlViewMetadata(actualSqlViewUid);
      // Only fetch data automatically if this is programmatic (templateId prop provided)
      // For user-selected templates, wait for explicit execution
      if (templateId && templateId === selectedTemplateId) {
        fetchSqlViewData(selectedTemplateId);
      }
    }
  }, [selectedTemplateId, actualSqlViewUid, isAuthenticated, authToken]);

  // Listen for debug table generation events and update main data
  useEffect(() => {
    const handleGenerateTable = (event: CustomEvent) => {
      const { processedData, rawResponse, executionTime } = event.detail;
      console.log('🎯 Generate Table event received:', processedData);
      
      // Update the debug table data
      setDebugTableData(processedData);
      setShowDebugTable(true);
      
      // IMPORTANT: Also update the main useSqlView data directly
      // This will fix the metadata display showing 0 rows
      if (processedData && Array.isArray(processedData) && processedData.length > 0) {
        // Create metadata from the debug data
        const headers = Object.keys(processedData[0] || {});
        const newMetadata = {
          rowCount: processedData.length,
          executionTime: executionTime || rawResponse?.executionTime || 0,
          cached: false,
          columns: headers
        };
        
        setDebugMetadata(newMetadata);
        setUseDebugData(true);
        
        console.log('🔄 Updating main table data with debug data:', processedData.length, 'rows');
        console.log('📊 Debug metadata:', newMetadata);
      }
    };

    window.addEventListener('generateTableFromDebugData', handleGenerateTable as EventListener);
    
    return () => {
      window.removeEventListener('generateTableFromDebugData', handleGenerateTable as EventListener);
    };
  }, []);

  // Fetch SQL view metadata to extract variables
  const fetchSqlViewMetadata = async (sqlViewUid: string) => {
    if (!isAuthenticated || !authToken || !dhisBaseUrl) {
      console.error('Not authenticated for metadata fetch');
      return;
    }

    try {
      const response = await fetch(`/api/dhis2/sql-views?id=${sqlViewUid}`, {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'x-dhis2-base-url': dhisBaseUrl,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const metadata = await response.json();
        setSqlViewMetadata(metadata);
      } else {
        console.error('Failed to fetch SQL view metadata:', response.status);
      }
    } catch (error) {
      console.error('Error fetching SQL view metadata:', error);
    }
  };

  // Function to fetch data from SQL view
  const fetchSqlViewData = async (tid: string, options: { skipIfEmpty?: boolean } = {}) => {
    if (!tid || !actualSqlViewUid) return;

    try {
      // Convert filters to the format expected by the enhanced service
      const parameters: Record<string, string> = { ...sqlViewParameters };
      const sqlFilters: Record<string, string> = {};
      
      // Only apply filters that have values
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          // Determine if this should be a parameter or filter
          // Parameters are typically for variable substitution
          // Filters are for result filtering
          if (key.startsWith('var_')) {
            parameters[key.replace('var_', '')] = String(value);
          } else {
            sqlFilters[key] = String(value);
          }
        }
      });

      // If skipIfEmpty is true and we have no parameters or filters, don't make the call
      if (options.skipIfEmpty && 
          Object.keys(parameters).length === 0 && 
          Object.keys(sqlFilters).length === 0 &&
          Object.keys(sqlViewParameters).length === 0) {
        console.log('🚫 Skipping SQL view execution - no parameters or filters provided');
        return;
      }

      console.log('🔄 Executing SQL view with:', { parameters, filters: sqlFilters });

      await execute({
        parameters,
        filters: sqlFilters,
        useCache: true,
        cacheExpiry: 30
      });
    } catch (error) {
      console.error('Error fetching SQL view data:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    // Only fetch data if filters have actual values or are being reset
    const hasFilters = Object.values(newFilters).some(value => value && value.toString().trim() !== '');
    if (selectedTemplateId && actualSqlViewUid && (hasFilters || Object.keys(newFilters).length === 0)) {
      fetchSqlViewData(selectedTemplateId);
    }
  };

  // Handle parameter changes
  const handleParametersChange = (newParameters: Record<string, string>) => {
    setSqlViewParameters(newParameters);
    // Only fetch data if parameters have actual values
    const hasParameters = Object.values(newParameters).some(value => value && value.toString().trim() !== '');
    if (selectedTemplateId && actualSqlViewUid && hasParameters) {
      fetchSqlViewData(selectedTemplateId);
    }
  };

  // Transform data to match template field definitions (backward compatibility)
  const transformedData = data.map(row => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return row;

    const transformedRow: Record<string, any> = {};
    template.outputFields.forEach(field => {
      // Map template field names to actual data
      transformedRow[field.name] = row[field.column] || row[field.name];
    });
    return transformedRow;
  });

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <h3 className="font-semibold text-red-800 mb-2">Authentication Required</h3>
        <p className="text-red-700 mb-3">
          Please log in to access SQL view data.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go to Login →
        </a>
      </div>
    );
  }

  // If there are no templates available, show setup prompt
  if (availableTemplates.length === 0) {
    return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
          <h3 className="font-semibold text-yellow-800 mb-2">No SQL View Templates Found</h3>
          <p className="text-yellow-700 mb-3">
            No SQL view templates are available for the "{category}" category.
          </p>
          <a href="/admin/sql-views" className="text-blue-600 hover:underline">
            Manage SQL View Templates →
          </a>
        </div>
    );
  }

  // If templates exist but none are configured, show configuration prompt
  if (configuredTemplates.length === 0) {
    return (
              <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">SQL Views Not Configured</h3>
            <p className="text-yellow-700 mb-3">
              You have {availableTemplates.length} SQL view template(s) for "{category}" but they are not connected to actual DHIS2 SQL views.
            </p>
          <div className="mb-3">
            <p className="text-sm text-yellow-600 mb-2">Available templates:</p>
            <ul className="text-sm text-yellow-600 list-disc list-inside">
              {availableTemplates.map(template => (
                <li key={template.id}>{template.name}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Quick Setup Component */}
        <QuickSqlViewSetup />
        
        <div className="text-center">
          <a href="/setup/sql-views" className="text-blue-600 hover:underline text-sm">
            Or use the advanced setup page →
          </a>
        </div>
      </div>
    );
  }

  // Show warning if selected template is not configured
  if (selectedTemplateId && !actualSqlViewUid) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4">
        <h3 className="font-semibold text-orange-800 mb-2">Selected SQL View Not Configured</h3>
        <p className="text-orange-700 mb-3">
          The selected template "{templates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}" 
          is not connected to a DHIS2 SQL view.
        </p>
        <a href="/setup/sql-views" className="text-blue-600 hover:underline">
          Configure This SQL View →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">SQL View Data</h2>
        
        <div className="flex space-x-2">
          <select
            value={selectedTemplateId || ''}
            onChange={(e) => setSelectedTemplateId(e.target.value || undefined)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="">Select SQL View</option>
            {availableTemplates.map(template => {
              const isConfigured = isViewConfigured(template.id);
              return (
                <option key={template.id} value={template.id}>
                  {template.name} {!isConfigured ? '(Not Configured)' : ''}
                </option>
              );
            })}
          </select>
          
          <button
            onClick={async () => {
              console.log('🧹 Clearing all caches and forcing fresh data fetch');
              
              // Clear browser cache
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('sqlViewCache');
                localStorage.removeItem('sql-view-cache');
                console.log('✅ Cleared browser storage');
              }
              
              // Clear error state
              clearError();
              
              // Force refresh without cache
              if (selectedTemplateId && actualSqlViewUid) {
                console.log('🔄 Executing fresh SQL view call for:', actualSqlViewUid);
                await execute({ 
                  useCache: false, 
                  cache: false,
                  parameters: sqlViewParameters,
                  filters: filters
                });
              }
            }}
            disabled={loading || !selectedTemplateId || !actualSqlViewUid}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:bg-gray-300"
          >
            Clear Cache & Refresh
          </button>
          
          <button
            onClick={() => {
              if (loading) {
                console.log('🛑 Attempting to terminate SQL view execution');
                // Force stop loading state and clear any errors
                clearError();
                // Note: This is a UI-level termination. The actual request may continue in background.
                window.location.reload(); // As last resort for stuck operations
              } else {
                selectedTemplateId && fetchSqlViewData(selectedTemplateId);
              }
            }}
            disabled={!selectedTemplateId || !actualSqlViewUid}
            className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
              loading 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300'
            }`}
          >
            {loading ? (
              <>
                <span>⏹</span>
                <span>Terminate</span>
              </>
            ) : (
              <span>Refresh</span>
            )}
          </button>
        </div>
      </div>

      {/* Show configuration status */}
      {selectedTemplateId && (
        <div className="mb-4 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
          <span className="text-gray-600">Template: </span>
          <span className="font-medium">{templates.find(t => t.id === selectedTemplateId)?.name}</span>
          {actualSqlViewUid ? (
            <>
              <span className="text-gray-600 ml-4">DHIS2 SQL View UID: </span>
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{actualSqlViewUid}</span>
            </>
          ) : (
            <span className="text-red-600 ml-4">⚠ Not configured</span>
          )}
        </div>
      )}

      {/* Debug Component */}
      {selectedTemplateId && actualSqlViewUid && (
        <SqlViewDebugger 
          sqlViewId={actualSqlViewUid} 
          templateId={selectedTemplateId}
        />
      )}

      {/* Status and Instructions */}
      {selectedTemplateId && actualSqlViewUid && !useDebugData && data.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ No Data in Main Table</h4>
          <p className="text-yellow-800 text-sm mb-2">
            If the SQL View Debug Info shows JSON data but the main table is empty, 
            use the "Generate Table" button in the debug section below to manually create the table.
          </p>
          <p className="text-yellow-700 text-xs">
            This often happens when the automatic API integration has issues but the debug proxy works correctly.
          </p>
        </div>
      )}

      {/* Debug Table Generator - Alternative Manual Table Creation */}
      {selectedTemplateId && actualSqlViewUid && (
        <DebugTableGenerator className="mb-6" />
      )}

      {/* Display parameter input for SQL views with variables */}
      {selectedTemplateId && actualSqlViewUid && sqlViewMetadata && (
        <SqlViewParameterInput
          sqlViewId={actualSqlViewUid}
          sqlQuery={sqlViewMetadata.sqlQuery}
          onParametersChange={handleParametersChange}
          disabled={loading}
          className="mb-4"
        />
      )}

      {/* Display filter component if a template is selected */}
      {selectedTemplateId && actualSqlViewUid && (
        <SqlViewDataFilter 
          templateId={selectedTemplateId}
          onFilterChange={handleFilterChange}
          currentFilters={filters}
          disabled={loading}
        />
      )}

      {/* Enhanced metadata display - prioritize debug metadata when available */}
      {(debugMetadata || metadata) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900">
              {useDebugData ? '🎯 Data from Debug Table Generation' : 'SQL View Execution Results'}
            </span>
            {useDebugData && (
              <button
                onClick={() => {
                  setUseDebugData(false);
                  setShowDebugTable(false);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Reset to Original
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Rows:</span>
              <span className="font-semibold ml-1">
                {useDebugData ? debugMetadata?.rowCount : metadata?.rowCount}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Execution Time:</span>
              <span className="font-semibold ml-1">
                {useDebugData ? debugMetadata?.executionTime : metadata?.executionTime}ms
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ml-1 ${
                useDebugData 
                  ? 'text-green-600' 
                  : metadata?.cached ? 'text-green-600' : 'text-blue-600'
              }`}>
                {useDebugData ? 'Generated from Debug' : metadata?.cached ? 'Cached' : 'Fresh'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Columns:</span>
              <span className="font-semibold ml-1">
                {useDebugData ? debugMetadata?.columns?.length : headers.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="text-red-700 text-sm">
              <strong>SQL View execution failed:</strong> {error}
              {error.includes('404') && (
                <div className="mt-1 text-xs">
                  The SQL view might not exist on the DHIS2 server. Check the configuration.
                </div>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Enhanced data table with batch loading and interactive features */}
      {useDebugData && debugTableData.length > 0 ? (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-green-900">
              🎯 Main SQL View Data Table (Generated from Debug JSON)
            </h3>
            <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
              {debugTableData.length} rows loaded
            </span>
          </div>
          <SqlViewDataTable
            data={debugTableData}
            headers={debugMetadata?.columns || Object.keys(debugTableData[0] || {})}
            loading={false}
            className="mt-4"
            pageSize={50}
            showExport={true}
            showFilter={true}
            showPagination={true}
          />
        </div>
      ) : selectedTemplateId && actualSqlViewUid ? (
        <EnhancedSqlViewTable
          sqlViewId={actualSqlViewUid}
          initialBatchSize={50}
          maxRows={10000}
          autoLoad={false}
        />
      ) : (
        <SqlViewDataTable
          data={transformedData}
          headers={headers}
          loading={loading}
          className="mt-4"
          pageSize={50}
          showExport={true}
          showFilter={true}
          showPagination={true}
        />
      )}

      {/* Show execution prompt when template is selected but no data yet */}
      {selectedTemplateId && actualSqlViewUid && !useDebugData && data.length === 0 && !loading && !error && (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg mt-4">
          <div className="text-gray-600 mb-4">
            <div className="text-lg font-medium mb-2">📊 SQL View Ready</div>
            <p className="text-sm mb-3">
              The SQL view "{templates.find(t => t.id === selectedTemplateId)?.name}" is configured and ready to execute.
            </p>
            <div className="space-y-2 text-xs text-gray-500 mb-4">
              <p>• Filters are optional - you can run the SQL view with or without them</p>
              <p>• Click "Execute Without Filters" to run the SQL view as-is</p>
              <p>• Or set parameters/filters above and click "Apply Filters"</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => selectedTemplateId && fetchSqlViewData(selectedTemplateId)}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Executing...' : 'Execute SQL View Now'}
            </button>
            
            {loading && (
              <button
                onClick={() => {
                  console.log('🛑 Emergency terminate - reloading page to stop execution');
                  clearError();
                  // Emergency termination by reloading the page
                  window.location.reload();
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center space-x-2"
                title="Emergency stop - will reload the page"
              >
                <span>⏹</span>
                <span>Emergency Stop</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback message when no template is selected */}
      {!selectedTemplateId && (
        <div className="text-center py-6 text-gray-500 mt-4">
          Select a configured SQL view to display data
        </div>
      )}
    </div>
  );
} 