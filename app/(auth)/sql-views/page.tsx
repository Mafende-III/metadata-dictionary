'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export default function SqlViewsPage() {
  const router = useRouter();
  const { dhisBaseUrl } = useAuthStore();
  const [testSqlViewId, setTestSqlViewId] = useState('w1JM5arbLNJ'); // Example SQL View ID from DHIS2 demo

  const clearAllCaches = () => {
    // Clear browser caches
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
      console.log('✅ Cleared all browser storage');
    }
    alert('Cache cleared successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SQL Views</h1>
          <p className="text-gray-600 mt-1">Enhanced SQL view testing and metadata analysis</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={clearAllCaches}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Quick Test Section */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick SQL View Test</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SQL View ID to Test
            </label>
            <input
              type="text"
              value={testSqlViewId}
              onChange={(e) => setTestSqlViewId(e.target.value)}
              className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter SQL View UID"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: w1JM5arbLNJ (from DHIS2 demo - replace with your SQL View ID)
            </p>
          </div>
          <button
            onClick={() => router.push(`/sql-views/demo?id=${testSqlViewId}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Test Enhanced SQL View Table
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Data Elements</h3>
          <p className="text-gray-600 text-sm mb-4">
            Browse data elements with SQL view integration
          </p>
          <button
            onClick={() => router.push('/data-elements')}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            View Data Elements
          </button>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Indicators</h3>
          <p className="text-gray-600 text-sm mb-4">
            Browse indicators with SQL view integration
          </p>
          <button
            onClick={() => router.push('/indicators')}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            View Indicators
          </button>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Dashboards</h3>
          <p className="text-gray-600 text-sm mb-4">
            Browse dashboards with SQL view integration
          </p>
          <button
            onClick={() => router.push('/dashboards')}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            View Dashboards
          </button>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">SQL Views Demo</h3>
          <p className="text-gray-600 text-sm mb-4">
            Test the enhanced SQL view functionality with progress tracking
          </p>
          <button
            onClick={() => router.push('/sql-views/demo')}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          >
            Open Demo
          </button>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Setup & Configuration</h3>
          <p className="text-gray-600 text-sm mb-4">
            Configure SQL view templates and settings
          </p>
          <button
            onClick={() => router.push('/setup/sql-views')}
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
          >
            Setup SQL Views
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">System Status</h3>
        <div className="space-y-2 text-sm text-green-800">
          <p>• <strong>Connected to:</strong> {dhisBaseUrl}</p>
          <p>• <strong>Authentication:</strong> ✅ Active session</p>
          <p>• <strong>Enhanced Features:</strong> ✅ Multi-page fetching, debugging tools, export capabilities</p>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Enhanced SQL View Features</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Multi-Page Data Fetching:</strong> Automatically retrieves all pages from DHIS2 API</p>
          <p>• <strong>Interactive Tables:</strong> Sorting, filtering, pagination, and export capabilities</p>
          <p>• <strong>Debug Tools:</strong> JSON response viewer with manual table generation</p>
          <p>• <strong>Progress Tracking:</strong> Real-time loading indicators for batch operations</p>
          <p>• <strong>Saved Metadata:</strong> Save and manage metadata dictionary analyses</p>
          <p>• <strong>Export Options:</strong> CSV and JSON export with proper formatting</p>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-yellow-800 text-sm">
            <strong>💡 Tip:</strong> If automatic table loading fails, use the "Generate Table" button in Debug Info 
            to manually create an interactive table from the JSON response.
          </p>
        </div>
      </div>
    </div>
  );
}