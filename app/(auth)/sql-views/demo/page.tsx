'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SqlViewDataDisplay from '@/src/components/features/sql-views/SqlViewDataDisplay';
import SqlViewParameterInput from '@/src/components/features/sql-views/SqlViewParameterInput';
import SqlViewDataTable from '@/src/components/features/sql-views/SqlViewDataTable';
import EnhancedSqlViewTable from '@/src/components/features/sql-views/EnhancedSqlViewTable';
import SqlViewDebugger from '@/src/components/features/sql-views/SqlViewDebugger';
import DebugTableGenerator from '@/src/components/features/sql-views/DebugTableGenerator';

// Mock data for testing the listGrid format parsing
const mockListGridResponse = {
  listGrid: {
    headers: [
      { name: "data_element_name" },
      { name: "opening_date" },
      { name: "first_period_start" }
    ],
    rows: [
      ["ENV002 EVI - Enhanced vegetation index", "2025-04-10", "2010-01-01"],
      ["Adults with fever treated", "2025-02-04", "2015-07-01"],
      ["BCG doses given", "2024-12-15", "2009-01-01"],
      ["Measles doses given", "2024-11-20", "2008-01-01"],
      ["OPV3 doses given", "2024-10-05", "2007-01-01"]
    ]
  }
};

export default function SqlViewDemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'debug' | 'enhanced' | 'legacy'>('debug');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [testSqlViewId, setTestSqlViewId] = useState(searchParams.get('id') || 'w1JM5arbLNJ');

  // Transform mock data to match expected format
  const transformMockData = () => {
    const { listGrid } = mockListGridResponse;
    const headers = listGrid.headers.map(h => h.name);
    const data = listGrid.rows.map(row => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    return { data, headers };
  };

  const { data: mockData, headers: mockHeaders } = transformMockData();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced SQL View Demo</h1>
          <p className="text-gray-600 mt-1">
            Test enhanced SQL view functionality with batch loading, progress tracking, and interactive filtering.
          </p>
        </div>
        <button
          onClick={() => router.push('/sql-views')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Back to SQL Views
        </button>
      </div>

        {/* SQL View ID Input */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">SQL View Configuration</h2>
          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SQL View ID to Test
              </label>
              <input
                type="text"
                value={testSqlViewId}
                onChange={(e) => setTestSqlViewId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SQL View UID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: w1JM5arbLNJ (DHIS2 demo instance)
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Test
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="border-b px-6 pt-4">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('debug')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'debug'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔍 Debug & Manual Generation
              </button>
              <button
                onClick={() => setActiveTab('enhanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'enhanced'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🚀 Enhanced Multi-Page Table
              </button>
              <button
                onClick={() => setActiveTab('legacy')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'legacy'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Legacy Integration
              </button>
            </nav>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-green-700 mb-2">✅ DHIS2 listGrid Support</h3>
            <p className="text-sm text-gray-600">
              Properly parses DHIS2's listGrid format with headers and rows
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-green-700 mb-2">✅ Dynamic Parameters</h3>
            <p className="text-sm text-gray-600">
              Automatic detection and input for ${'{'}variableName{'}'} syntax
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-green-700 mb-2">✅ Advanced Table Features</h3>
            <p className="text-sm text-gray-600">
              Sorting, filtering, pagination, and CSV/JSON export
            </p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            {/* SQL View Debug Info with Manual Table Generation */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-3">
                🔍 SQL View Debug Info & Manual Table Generation
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-blue-800 text-sm mb-2">
                  <strong>📋 Instructions:</strong> This shows the raw JSON response with multi-page fetching. When data is returned, click "Generate Table" to create an interactive table view.
                </p>
                <p className="text-blue-700 text-xs">
                  <strong>🎯 Expected Behavior:</strong> After clicking "Generate Table", the metadata above should update to show actual row counts and the main table should populate with data from ALL pages.
                </p>
              </div>
              
              <SqlViewDebugger 
                sqlViewId={testSqlViewId} 
                templateId="demo"
              />
            </div>

            {/* Debug Table Generator */}
            <DebugTableGenerator className="mb-6" />
          </div>
        )}

        {activeTab === 'enhanced' && (
          <div className="space-y-6">
            {/* Enhanced SQL View Table Demo */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-3">
                🚀 Enhanced SQL View Table with Multi-Page Fetching
              </h2>
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                <p className="text-green-800 text-sm">
                  <strong>✅ NEW Features:</strong> Multi-page data fetching • Progress bar with page tracking • Interactive filtering • Auto column detection • CSV export • 50 rows per page
                </p>
              </div>
              
              <EnhancedSqlViewTable
                sqlViewId={testSqlViewId}
                initialBatchSize={50}
                maxRows={2000}
                autoLoad={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'legacy' && (
          <div className="space-y-6">
            {/* Legacy Integration */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-3">
                📋 Legacy Integration with SqlViewDataDisplay
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This uses the integrated SqlViewDataDisplay component with the enhanced table system.
              </p>
              
              <SqlViewDataDisplay 
                category="data_elements"
                filter={{}}
              />
            </div>

            {/* Mock Data Demo */}
            <div className="bg-white rounded-lg border p-6 mt-6">
              <h2 className="text-lg font-semibold mb-3">
                Mock Data - DHIS2 listGrid Format
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This demonstrates how the enhanced SQL view components handle the actual DHIS2 response format:
              </p>
              
              {/* Show raw response format */}
              <details className="mb-4">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  View Raw DHIS2 Response Format
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(mockListGridResponse, null, 2)}
                </pre>
              </details>

              {/* Enhanced Data Table */}
              <SqlViewDataTable
                data={mockData}
                headers={mockHeaders}
                loading={false}
                pageSize={10}
                showExport={true}
                showFilter={true}
                showPagination={true}
              />
            </div>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            ✅ Enhanced SQL View System - Multi-Page Implementation Complete
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">🚀 Multi-Page Data Fetching:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>Auto-Detection:</strong> Automatically detects multi-page responses</li>
                <li>• <strong>Complete Fetch:</strong> Retrieves ALL pages from DHIS2 API (up to 20 pages safety limit)</li>
                <li>• <strong>Real-time Progress:</strong> Page-by-page progress tracking with percentage</li>
                <li>• <strong>Fallback Systems:</strong> Batch API with direct multi-page fallback</li>
                <li>• <strong>Safety Limits:</strong> Prevents infinite loops with configurable maxRows</li>
                <li>• <strong>Manual Generation:</strong> "Generate Table" button for debug data integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">📊 Enhanced Table Features:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>Interactive Filtering:</strong> Global search + column-specific filters</li>
                <li>• <strong>Smart Column Detection:</strong> Auto-detects data types (string, number, date)</li>
                <li>• <strong>Advanced Sorting:</strong> Type-aware sorting with visual indicators</li>
                <li>• <strong>Flexible Pagination:</strong> 25, 50, 100, 200 rows per page options</li>
                <li>• <strong>CSV Export:</strong> Export filtered results with proper formatting</li>
                <li>• <strong>Progress Indicators:</strong> Loading states and completion feedback</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-green-100 rounded">
              <p className="text-green-800 text-sm">
                <strong>✅ Multi-Page Issue Resolved:</strong> System now fetches ALL pages automatically instead of just the first page. 
                Progress tracking shows "Batch X of Y" during multi-page loading.
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded">
              <p className="text-yellow-800 text-sm">
                <strong>🎯 Manual Table Generation:</strong> Use the "Generate Table" button in Debug tab when automatic loading fails. 
                This creates an interactive table from the JSON debug data with proper metadata synchronization.
              </p>
            </div>
          </div>
        </div>

        {/* API Usage Example */}
        <div className="bg-gray-50 border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            API Usage Examples
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">1. Execute SQL View via Proxy:</h3>
              <code className="block bg-white p-2 rounded text-sm font-mono">
                GET /api/dhis2/proxy?path=/sqlViews/{"<"}sqlViewId{">"}/data.json
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">2. Execute with Parameters:</h3>
              <code className="block bg-white p-2 rounded text-sm font-mono">
                GET /api/dhis2/proxy?path=/sqlViews/{"<"}id{">"}/data.json&var=startDate:2024-01-01&var=orgUnit:xyz
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">3. Expected Response Format:</h3>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`{
  "listGrid": {
    "headers": [{"name": "column1"}, {"name": "column2"}],
    "rows": [["value1", "value2"], ["value3", "value4"]]
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
  );
} 