'use client';

import { useState } from 'react';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { SqlViewService } from '@/lib/services/sqlViewService';

export default function QuickSqlViewSetup() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string; uid?: string }>>({});

  const { templates } = useAdminSqlViewStore();
  const { setConfiguredView, isViewConfigured, getViewUid } = useSqlViewStore();
  const { getDhisBaseUrl, getAuthToken, isAuthenticated } = useAuthStore();

  const createAndConfigureSqlView = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || !isAuthenticated) return;

    setLoading(prev => ({ ...prev, [templateId]: true }));

    try {
      const service = new SqlViewService(getDhisBaseUrl(), getAuthToken());

      // Create the SQL view in DHIS2
      const payload = {
        name: template.name,
        description: template.description || `Auto-generated from template: ${template.name}`,
        sqlQuery: template.sqlQuery,
        type: 'VIEW',
        cacheStrategy: 'RESPECT_SYSTEM_SETTING'
      };

      const result = await service.createSqlView(payload);
      
      // Configure the mapping in the store
      setConfiguredView(templateId, result.uid || '', template.name);

      setResults(prev => ({
        ...prev,
        [templateId]: {
          success: true,
          message: `Successfully created SQL view with UID: ${result.uid}`,
          uid: result.uid
        }
      }));

    } catch (error) {
      console.error('Failed to create SQL view:', error);
      setResults(prev => ({
        ...prev,
        [templateId]: {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create SQL view'
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [templateId]: false }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Authentication Required</h3>
        <p className="text-yellow-700">
          Please authenticate with DHIS2 first to create SQL views.
        </p>
      </div>
    );
  }

  const unconfiguredTemplates = templates.filter(template => !isViewConfigured(template.id));

  if (unconfiguredTemplates.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">✅ All Templates Configured</h3>
        <p className="text-green-700">
          All SQL view templates are properly configured and connected to DHIS2 SQL views.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Quick SQL View Setup</h3>
      <p className="text-gray-600 mb-4">
        Create DHIS2 SQL views from your templates and configure the mappings automatically.
      </p>

      <div className="space-y-4">
        {unconfiguredTemplates.map(template => {
          const isLoading = loading[template.id];
          const result = results[template.id];

          return (
            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      DHIS2 {template.dhisVersions.join(', ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => createAndConfigureSqlView(template.id)}
                  disabled={isLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create & Configure'}
                </button>
              </div>

              {result && (
                <div className={`mt-3 p-3 rounded ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.success ? '✅' : '❌'} {result.message}
                  </div>
                  {result.uid && (
                    <div className="text-xs text-gray-600 mt-1">
                      SQL View UID: <code className="bg-gray-100 px-1 rounded">{result.uid}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">What this does:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Creates actual SQL views in your DHIS2 instance using the template queries</li>
          <li>• Configures the mapping between template IDs and DHIS2 SQL view UIDs</li>
          <li>• Enables the SQL view components to fetch and display data</li>
          <li>• Uses DHIS2's standard caching strategy for performance</li>
        </ul>
      </div>
    </div>
  );
} 