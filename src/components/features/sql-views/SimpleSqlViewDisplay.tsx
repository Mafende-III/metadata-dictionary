import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface SimpleSqlViewDisplayProps {
  templateId: string;
  sqlViewId: string;
}

export default function SimpleSqlViewDisplay({ templateId, sqlViewId }: SimpleSqlViewDisplayProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  // Get authentication from store
  const { getAuthToken, getDhisBaseUrl, isAuthenticated } = useAuthStore();

  const fetchSqlViewData = async () => {
    if (!isAuthenticated) {
      setError('Not authenticated. Please log in first.');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Add cache-busting parameter and headers with authentication
      const cacheBuster = Date.now();
      const authToken = getAuthToken();
      const baseUrl = getDhisBaseUrl();
      
      console.log(`🔐 Making authenticated request with token for ${baseUrl}`);
      
      const response = await fetch(`/api/dhis2/proxy?path=${encodeURIComponent(`/sqlViews/${sqlViewId}/data.json`)}&_cb=${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${authToken}`,
          'x-dhis2-base-url': baseUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      setRawResponse(result); // Store for debugging
      
      console.log('Raw SQL View Response:', result);
      
      let processedData: any[] = [];
      let columnNames: string[] = [];
      
      // Enhanced parsing for DHIS2 listGrid format
      if (result.listGrid && result.listGrid.headers && result.listGrid.rows) {
        const { headers, rows } = result.listGrid;
        
        console.log('Headers:', headers);
        console.log('Rows sample:', rows.slice(0, 2));
        
        // Extract column names from headers - ensure we get the right property
        columnNames = headers.map((header: any, index: number) => {
          return header.name || header.column || header.displayName || `Column_${index}`;
        });
        
        console.log('Extracted column names:', columnNames);
        
        // Process each row of data
        processedData = rows.map((row: any[], rowIndex: number) => {
          const rowObject: any = { _rowIndex: rowIndex };
          
          // Map each value in the row to its corresponding column
          columnNames.forEach((columnName, colIndex) => {
            rowObject[columnName] = row[colIndex] !== undefined && row[colIndex] !== null 
              ? row[colIndex] 
              : '';
          });
          
          return rowObject;
        });
        
        console.log('Processed data sample:', processedData.slice(0, 2));
      }
      // Alternative format - direct headers and rows
      else if (result.headers && result.rows) {
        console.log('Using alternative format');
        
        columnNames = result.headers.map((header: any, index: number) => {
          return header.name || header.column || header.displayName || `Column_${index}`;
        });
        
        processedData = result.rows.map((row: any[], rowIndex: number) => {
          const rowObject: any = { _rowIndex: rowIndex };
          
          columnNames.forEach((columnName, colIndex) => {
            rowObject[columnName] = row[colIndex] !== undefined && row[colIndex] !== null 
              ? row[colIndex] 
              : '';
          });
          
          return rowObject;
        });
      }
      // Direct array format
      else if (Array.isArray(result)) {
        console.log('Using direct array format');
        
        if (result.length > 0) {
          columnNames = Object.keys(result[0]);
          processedData = result.map((item, index) => ({ ...item, _rowIndex: index }));
        }
      }
      // Nested data property
      else if (result.data && Array.isArray(result.data)) {
        console.log('Using nested data format');
        
        if (result.data.length > 0) {
          columnNames = Object.keys(result.data[0]);
          processedData = result.data.map((item: any, index: number) => ({ ...item, _rowIndex: index }));
        }
      }
      else {
        console.warn('Unknown response format:', result);
        throw new Error('Unsupported response format from DHIS2 SQL view');
      }
      
      const executionTime = Date.now() - startTime;
      
      setColumns(columnNames);
      setData(processedData);
      setFilteredData(processedData);
      setMetadata({
        rowCount: processedData.length,
        columnCount: columnNames.length,
        status: 'Fresh',
        executionTime,
        cached: false
      });
      
      console.log('Final state:', {
        columns: columnNames,
        dataCount: processedData.length,
        columnCount: columnNames.length
      });
      
    } catch (error: any) {
      console.error('Failed to fetch SQL view data:', error);
      setError(error.message || 'Failed to fetch SQL view data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sqlViewId) {
      fetchSqlViewData();
    }
  }, [sqlViewId, isAuthenticated]);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm) {
      const filtered = data.filter(row => 
        Object.entries(row).some(([key, value]) => {
          // Skip internal properties
          if (key.startsWith('_')) return false;
          return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  const exportCsv = () => {
    if (!columns.length || !filteredData.length) return;
    
    const csv = [
      columns.join(','),
      ...filteredData.map(row => 
        columns.map(col => {
          const value = row[col];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!filteredData.length) return;
    
    // Remove internal properties
    const exportData = filteredData.map(row => {
      const cleanRow: any = {};
      Object.entries(row).forEach(([key, value]) => {
        if (!key.startsWith('_')) {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return '';
    
    // Format dates
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    
    return String(value);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Template: <strong>{templateId}</strong> | DHIS2 SQL View UID: <strong>{sqlViewId}</strong>
            </p>
          </div>
          <button
            onClick={fetchSqlViewData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium">Error loading SQL view data</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && !error && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Rows: </span>
              <strong>{metadata.rowCount}</strong>
            </div>
            <div>
              <span className="text-gray-600">Execution Time: </span>
              <strong>{metadata.executionTime}ms</strong>
            </div>
            <div>
              <span className="text-gray-600">Status: </span>
              <strong className="text-green-600">{metadata.status}</strong>
            </div>
            <div>
              <span className="text-gray-600">Columns: </span>
              <strong>{metadata.columnCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Search and Export */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            disabled
            className="flex items-center gap-2 px-3 py-2 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
          >
            <Filter className="w-4 h-4" />
            Filters (Coming Soon)
          </button>
          <button
            onClick={exportCsv}
            disabled={!filteredData.length}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportJson}
            disabled={!filteredData.length}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-500">Loading SQL view data...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-4" />
          <p className="text-gray-500">Failed to load data. Please try refreshing.</p>
        </div>
      ) : filteredData.length > 0 && columns.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, index) => (
                    <th 
                      key={index} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, rowIndex) => (
                  <tr key={row._rowIndex || rowIndex} className="hover:bg-gray-50">
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Show search results info */}
          {searchTerm && (
            <div className="px-6 py-3 bg-gray-50 border-t">
              <p className="text-sm text-gray-600">
                Showing {filteredData.length} of {data.length} rows matching "{searchTerm}"
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No data available</p>
          {rawResponse && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                Debug: View Raw Response
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
} 