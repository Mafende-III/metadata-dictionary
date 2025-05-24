import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';

interface SqlViewDebuggerProps {
  sqlViewId: string;
  templateId?: string;
}

export default function SqlViewDebugger({ sqlViewId, templateId }: SqlViewDebuggerProps) {
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
      
      console.log('Raw SQL View Response:', data);
      
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

  if (!showRaw) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowRaw(true)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          Show Debug Info
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-900">SQL View Debug Info</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={executeSqlView}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowRaw(false)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <EyeOff className="w-4 h-4" />
            Hide
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-3 flex items-center gap-4 text-sm">
        {error ? (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        ) : processedData.length > 0 ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Success</span>
          </div>
        ) : null}
        <span className="text-gray-600">
          Rows: {processedData.length} | Time: {executionTime}ms
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Raw Response */}
      {rawResponse && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Raw Response:</span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(rawResponse, null, 2))}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto max-h-40">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-600">
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
  );
} 