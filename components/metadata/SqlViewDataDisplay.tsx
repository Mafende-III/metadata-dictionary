'use client';

import { useState, useEffect } from 'react';
import { useSqlView } from '../../hooks/useSqlView';
import { useAdminSqlViewStore } from '../../lib/stores/adminSqlViewStore';
import { useSqlViewStore } from '../../lib/stores/sqlViewStore';
import SqlViewDataFilter from './SqlViewDataFilter';
import SqlViewParameterInput from './SqlViewParameterInput';
import SqlViewDataTable from './SqlViewDataTable';
import QuickSqlViewSetup from '../setup/QuickSqlViewSetup';
import SqlViewDebugger from './SqlViewDebugger';

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

  const { templates, getTemplatesByCategory } = useAdminSqlViewStore();
  const { getViewUid, isViewConfigured } = useSqlViewStore();

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

  // Use effect to fetch data when templateId changes
  useEffect(() => {
    if (selectedTemplateId && actualSqlViewUid) {
      fetchSqlViewMetadata(actualSqlViewUid);
      fetchSqlViewData(selectedTemplateId);
    }
  }, [selectedTemplateId, actualSqlViewUid]);

  // Fetch SQL view metadata to extract variables
  const fetchSqlViewMetadata = async (sqlViewUid: string) => {
    try {
      const response = await fetch(`/api/dhis2/sql-views?id=${sqlViewUid}`);
      if (response.ok) {
        const metadata = await response.json();
        setSqlViewMetadata(metadata);
      }
    } catch (error) {
      console.error('Error fetching SQL view metadata:', error);
    }
  };

  // Function to fetch data from SQL view
  const fetchSqlViewData = async (tid: string) => {
    if (!tid || !actualSqlViewUid) return;

    try {
      // Convert filters to the format expected by the enhanced service
      const parameters: Record<string, string> = { ...sqlViewParameters };
      const sqlFilters: Record<string, string> = {};
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
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
    if (selectedTemplateId && actualSqlViewUid) {
      fetchSqlViewData(selectedTemplateId);
    }
  };

  // Handle parameter changes
  const handleParametersChange = (newParameters: Record<string, string>) => {
    setSqlViewParameters(newParameters);
    if (selectedTemplateId && actualSqlViewUid) {
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
            onClick={() => selectedTemplateId && fetchSqlViewData(selectedTemplateId)}
            disabled={loading || !selectedTemplateId || !actualSqlViewUid}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Loading...' : 'Refresh'}
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
        />
      )}

      {/* Enhanced metadata display */}
      {metadata && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Rows:</span>
              <span className="font-semibold ml-1">{metadata.rowCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Execution Time:</span>
              <span className="font-semibold ml-1">{metadata.executionTime}ms</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ml-1 ${metadata.cached ? 'text-green-600' : 'text-blue-600'}`}>
                {metadata.cached ? 'Cached' : 'Fresh'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Columns:</span>
              <span className="font-semibold ml-1">{headers.length}</span>
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

      {/* Enhanced data table with all features */}
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

      {/* Fallback message when no template is selected */}
      {!selectedTemplateId && (
        <div className="text-center py-6 text-gray-500 mt-4">
          Select a configured SQL view to display data
        </div>
      )}
    </div>
  );
} 