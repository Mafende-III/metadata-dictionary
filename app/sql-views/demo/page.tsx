'use client';

import { useState } from 'react';
import SqlViewDataDisplay from '../../../components/metadata/SqlViewDataDisplay';
import SqlViewParameterInput from '../../../components/metadata/SqlViewParameterInput';
import SqlViewDataTable from '../../../components/metadata/SqlViewDataTable';

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
  const [demoMode, setDemoMode] = useState<'live' | 'mock'>('mock');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SQL View Demo - Enhanced Features
          </h1>
          <p className="text-gray-600">
            Demonstrating the complete SQL view functionality with parameter input, 
            advanced filtering, sorting, pagination, and export capabilities.
          </p>
        </div>

        {/* Demo Mode Toggle */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Demo Mode</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setDemoMode('mock')}
              className={`px-4 py-2 rounded-md transition-colors ${
                demoMode === 'mock'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mock Data (DHIS2 listGrid Format)
            </button>
            <button
              onClick={() => setDemoMode('live')}
              className={`px-4 py-2 rounded-md transition-colors ${
                demoMode === 'live'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Live DHIS2 Connection
            </button>
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

        {demoMode === 'mock' ? (
          <div className="space-y-6">
            {/* Mock Data Demo */}
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-3">
                DHIS2 listGrid Response Format Demo
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

              {/* Parameter Input Demo */}
              <div className="mb-4">
                <SqlViewParameterInput
                  sqlViewId="demo"
                  sqlQuery="SELECT name as data_element_name, ${startDate} as opening_date, ${orgUnit} as first_period_start FROM dataelement WHERE name LIKE '%${searchTerm}%'"
                  onParametersChange={(params) => console.log('Parameters changed:', params)}
                  className="mb-4"
                />
              </div>

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
        ) : (
          <div className="space-y-6">
            {/* Live DHIS2 Demo */}
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-3">
                Live DHIS2 SQL View Connection
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Connect to a real DHIS2 instance to test SQL view execution with the enhanced features.
              </p>
              
              <SqlViewDataDisplay 
                category="data_elements"
                filter={{}}
              />
            </div>
          </div>
        )}

        {/* Implementation Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Implementation Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">🔧 Fixed Issues:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• Created proper proxy endpoint for authenticated requests</li>
                <li>• Fixed listGrid format parsing in SqlViewService</li>
                <li>• Added proper session management</li>
                <li>• Enhanced error handling and loading states</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">✨ New Features:</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• Dynamic parameter input with type detection</li>
                <li>• Advanced table with sorting and filtering</li>
                <li>• CSV/JSON export functionality</li>
                <li>• Pagination for large datasets</li>
                <li>• Caching system for SQL view results</li>
              </ul>
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
    </div>
  );
} 