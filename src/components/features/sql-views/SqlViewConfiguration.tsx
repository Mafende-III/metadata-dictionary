'use client';

import { useState, useEffect } from 'react';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { SqlViewService } from '@/lib/services/sqlViewService';
import { SqlViewTemplate } from '@/types/sqlView';

export default function SqlViewConfiguration() {
  const { templates } = useAdminSqlViewStore();
  const { 
    dhisVersion, 
    configuredViews, 
    setConfiguredView, 
    removeConfiguredView,
    updateViewStatus 
  } = useSqlViewStore();
  
  const { getDhisBaseUrl, getAuthToken, isAuthenticated } = useAuthStore();
  
  const [testingView, setTestingView] = useState<string>('');
  const [copied, setCopied] = useState<string>('');

  const compatibleTemplates = templates.filter(
    template => template.dhisVersions.includes(dhisVersion) && template.isActive
  );

  if (!isAuthenticated) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900 mb-2">Authentication Required</h3>
        <p className="text-red-800">
          Please configure your DHIS2 credentials before setting up SQL views.
        </p>
        <a href="/auth" className="mt-3 inline-block bg-blue-500 text-white px-4 py-2 rounded">
          Configure Credentials
        </a>
      </div>
    );
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const generateApiPayload = (template: SqlViewTemplate) => ({
    name: template.name,
    description: template.description,
    sqlQuery: template.sqlQuery,
    type: "VIEW",
    cacheStrategy: "RESPECT_SYSTEM_SETTING"
  });

  const testConnection = async (templateId: string) => {
    const view = configuredViews[templateId];
    if (!view) return;

    setTestingView(templateId);
    try {
      const sqlService = new SqlViewService(getDhisBaseUrl(), getAuthToken());
      const result = await sqlService.validateView(view.uid);
      updateViewStatus(templateId, result.isValid ? 'success' : 'error', result.error);
    } catch (error) {
      updateViewStatus(templateId, 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setTestingView('');
    }
  };

  const handleUidSubmit = (templateId: string, uid: string, name: string) => {
    if (uid.length === 11 && /^[a-zA-Z0-9]{11}$/.test(uid)) {
      setConfiguredView(templateId, uid, name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-green-800 text-sm">
            ✓ Connected to: {getDhisBaseUrl()}
          </span>
          <button 
            onClick={() => console.log('Auth token:', getAuthToken())}
            className="text-xs bg-gray-200 px-2 py-1 rounded"
          >
            Debug Auth
          </button>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Configuration Steps:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>Copy the SQL query or API payload for each template</li>
          <li>Create the SQL view in your DHIS2 instance (Data Administration → SQL Views)</li>
          <li>Copy the generated UID from DHIS2</li>
          <li>Paste the UID below and test the connection</li>
        </ol>
      </div>

      {compatibleTemplates.map((template) => {
        const configuredView = configuredViews[template.id];
        const isConfigured = Boolean(configuredView);
        
        return (
          <div key={template.id} className="border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-gray-600">{template.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {template.category}
                  </span>
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                    {template.outputFields.length} fields
                  </span>
                </div>
              </div>
              
              {isConfigured && (
                <div className="flex items-center gap-2">
                  {configuredView.testStatus === 'success' && (
                    <span className="text-green-600 text-sm">✓ Connected</span>
                  )}
                  {configuredView.testStatus === 'error' && (
                    <span className="text-red-600 text-sm">✗ Error</span>
                  )}
                  <button
                    onClick={() => removeConfiguredView(template.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* SQL Query */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">SQL Query:</h4>
                <button
                  onClick={() => copyToClipboard(template.sqlQuery, `sql_${template.id}`)}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {copied === `sql_${template.id}` ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-32">
                {template.sqlQuery}
              </pre>
            </div>

            {/* API Payload */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">API Creation Payload:</h4>
                <button
                  onClick={() => copyToClipboard(
                    JSON.stringify(generateApiPayload(template), null, 2), 
                    `api_${template.id}`
                  )}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  {copied === `api_${template.id}` ? 'Copied!' : 'Copy Payload'}
                </button>
              </div>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-32">
                {JSON.stringify(generateApiPayload(template), null, 2)}
              </pre>
            </div>

            {/* UID Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Configure SQL View UID:</h4>
              
              {!isConfigured ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste SQL View UID (11 characters)"
                    className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                    maxLength={11}
                    onChange={(e) => {
                      const uid = e.target.value.trim();
                      if (uid.length === 11) {
                        handleUidSubmit(template.id, uid, template.name);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium">
                        UID: <code className="bg-gray-200 px-1 rounded">{configuredView.uid}</code>
                      </div>
                      <div className="text-xs text-gray-600">
                        API Endpoint: <code>/api/sqlViews/{configuredView.uid}/data.json</code>
                      </div>
                    </div>
                    <button
                      onClick={() => testConnection(template.id)}
                      disabled={testingView === template.id}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {testingView === template.id ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  
                  {configuredView.testStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="text-red-800 text-sm font-medium">Connection Error:</div>
                      <div className="text-red-700 text-sm">{configuredView.errorMessage}</div>
                    </div>
                  )}
                  
                  {configuredView.testStatus === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="text-green-800 text-sm">
                        ✓ Connection successful! Last tested: {configuredView.lastTested?.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 