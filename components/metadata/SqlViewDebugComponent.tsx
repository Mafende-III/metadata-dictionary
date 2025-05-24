import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';

interface SqlViewDebugProps {
  sqlViewId: string;
  templateId?: string;
}

export default function SqlViewDebugComponent({ sqlViewId, templateId }: SqlViewDebugProps) {
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [executionTime, setExecutionTime] = useState<number>(0);

  const executeSqlView = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Direct API call to see raw response
      const response = await fetch(`/api/dhis2/proxy?path=/sqlViews/${sqlViewId}/data.json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRawResponse(data);
      
      // Process different response formats
      let processed: any[] = [];
      
      // Format 1: listGrid with headers and rows
      if (data.listGrid) {
        const { headers, rows } = data.listGrid;
        processed = rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header: any, index: number) => {
            const columnName = header.name || header.column || `col_${index}`;
            obj[columnName] = row[index];
          });
          return obj;
        });
      }
      // Format 2: Direct headers and rows
      else if (data.headers && data.rows) {
        processed = data.rows.map((row: any[]) => {
          const obj: any = {};
          data.headers.forEach((header: any, index: number) => {
            const columnName = header.name || header.column || `col_${index}`;
            obj[columnName] = row[index];
          });
          return obj;
        });
      }
      // Format 3: Direct array of objects
      else if (Array.isArray(data)) {
        processed = data;
      }
      // Format 4: Data might be nested in a property
      else if (data.data && Array.isArray(data.data)) {
        processed = data.data;
      }

      setProcessedData(processed);
      setExecutionTime(Date.now() - startTime);

    } catch (err) {
      console.error('SQL View execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute SQL view');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sqlViewId) {
      executeSqlView();
    }
  }, [sqlViewId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderDataTable = () => {
    if (!processedData.length) return null;

    const columns = Object.keys(processedData[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.slice(0, 10).map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {String(row[col] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {processedData.length > 10 && (
          <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
            Showing 10 of {processedData.length} rows
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">SQL View Debug Panel</h2>
              <p className="text-sm text-gray-600 mt-1">
                SQL View ID: <code className="bg-gray-100 px-2 py-1 rounded">{sqlViewId}</code>
              </p>
            </div>
            <button
              onClick={executeSqlView}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Error</span>
                </div>
              ) : processedData.length > 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Success</span>
                </div>
              ) : null}
              <span className="text-sm text-gray-600">
                Rows: {processedData.length} | Time: {executionTime}ms
              </span>
            </div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showRaw ? 'Hide' : 'Show'} Raw Response
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 m-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-1">Error Details</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Raw Response Display */}
        {showRaw && rawResponse && (
          <div className="p-6 border-b">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">Raw API Response</h3>
              <button
                onClick={() => copyToClipboard(JSON.stringify(rawResponse, null, 2))}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Data Display */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading SQL View data...
            </div>
          ) : processedData.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">Processed Data</h3>
              {renderDataTable()}
            </>
          ) : !error ? (
            <div className="text-center py-8 text-gray-500">
              No data available
            </div>
          ) : null}
        </div>

        {/* Debug Info */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Debug Information</h3>
          <div className="space-y-1 text-xs text-gray-600">
            <p>Response Type: {rawResponse ? typeof rawResponse : 'null'}</p>
            <p>Has listGrid: {rawResponse?.listGrid ? 'Yes' : 'No'}</p>
            <p>Has headers/rows: {rawResponse?.headers && rawResponse?.rows ? 'Yes' : 'No'}</p>
            <p>Is Array: {Array.isArray(rawResponse) ? 'Yes' : 'No'}</p>
            {rawResponse?.listGrid && (
              <>
                <p>Headers Count: {rawResponse.listGrid.headers?.length || 0}</p>
                <p>Rows Count: {rawResponse.listGrid.rows?.length || 0}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}