import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

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

  // Get authentication from auth store
  const { isAuthenticated, authToken, dhisBaseUrl } = useAuthStore();

  const executeSqlView = async () => {
    if (!isAuthenticated) {
      setError('Not authenticated. Please log in first.');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      if (!authToken || !dhisBaseUrl) {
        setError('No valid authentication found. Please log in again.');
        return;
      }

      console.log('🚀 Starting multi-page SQL view execution:', sqlViewId);
      
      // Step 1: Fetch first page to understand pagination
      let currentPage = 1;
      let allData: any[] = [];
      let headers: any[] = [];
      let totalPages = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`📄 Fetching page ${currentPage}...`);
        
        const pageUrl = `/api/dhis2/proxy?path=/sqlViews/${sqlViewId}/data.json${currentPage > 1 ? `&page=${currentPage}` : ''}`;
        
        const response = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${authToken}`,
            'x-dhis2-base-url': dhisBaseUrl,
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }

        const pageData = await response.json();
        
        // Store raw response from first page for debugging
        if (currentPage === 1) {
          setRawResponse(pageData);
          console.log('Raw SQL View Response (Page 1):', pageData);
        }

        // Process the current page data
        let pageProcessed: any[] = [];
        
        // Format 1: listGrid with headers and rows
        if (pageData.listGrid) {
          const { headers: pageHeaders, rows } = pageData.listGrid;
          if (currentPage === 1) {
            headers = pageHeaders;
          }
          pageProcessed = rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: any, index: number) => {
              const columnName = header.name || header.column || `col_${index}`;
              obj[columnName] = row[index];
            });
            return obj;
          });
          
          // Check for pagination info in DHIS2 response
          totalPages = Math.ceil((pageData.listGrid.height || rows.length) / (pageData.listGrid.width || 50));
        }
        // Format 2: Direct headers and rows
        else if (pageData.headers && pageData.rows) {
          if (currentPage === 1) {
            headers = pageData.headers;
          }
          pageProcessed = pageData.rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: any, index: number) => {
              const columnName = header.name || header.column || `col_${index}`;
              obj[columnName] = row[index];
            });
            return obj;
          });
        }
        // Format 3: Direct array of objects
        else if (Array.isArray(pageData)) {
          pageProcessed = pageData;
        }
        // Format 4: Data might be nested in a property
        else if (pageData.data && Array.isArray(pageData.data)) {
          pageProcessed = pageData.data;
        }

        // Add current page data to total
        allData = [...allData, ...pageProcessed];
        
        console.log(`✅ Page ${currentPage} processed: ${pageProcessed.length} rows (Total: ${allData.length})`);

        // Check if there are more pages
        // DHIS2 typically returns empty or smaller pages when no more data
        hasMorePages = pageProcessed.length > 0 && pageProcessed.length >= 50 && currentPage < 10; // Safety limit
        currentPage++;
        
        // Break if no data on current page
        if (pageProcessed.length === 0) {
          hasMorePages = false;
        }
      }

      setProcessedData(allData);
      setExecutionTime(Date.now() - startTime);
      
      console.log(`🎯 Multi-page fetch complete: ${allData.length} total rows from ${currentPage - 1} pages`);

    } catch (err) {
      console.error('❌ Multi-page SQL View execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute SQL view');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sqlViewId) {
      executeSqlView();
    }
  }, [sqlViewId, isAuthenticated]);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(JSON.stringify(rawResponse, null, 2))}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              {processedData.length > 0 && (
                <button
                  onClick={() => {
                    // Trigger a custom event to notify parent components
                    const event = new CustomEvent('generateTableFromDebugData', {
                      detail: { 
                        rawResponse, 
                        processedData,
                        rowCount: processedData.length,
                        executionTime: executionTime
                      }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Generate Table ({processedData.length} rows)
                </button>
              )}
            </div>
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