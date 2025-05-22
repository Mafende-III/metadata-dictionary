'use client';

import { useState } from 'react';
import { useSqlViewStore } from '../../../lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '../../../lib/stores/adminSqlViewStore';
import SqlViewDiscovery from '../../../components/setup/SqlViewDiscovery';
import SqlViewConfiguration from '../../../components/setup/SqlViewConfiguration';

export default function SqlViewSetupPage() {
  const [activeTab, setActiveTab] = useState<'configure' | 'discover'>('configure');
  const { dhisVersion, setDhisVersion, configuredViews, mappedViews } = useSqlViewStore();
  const { templates } = useAdminSqlViewStore();

  const totalConfigured = Object.keys(configuredViews).length + Object.keys(mappedViews).length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SQL View Setup</h1>
        <p className="text-gray-600 mt-2">
          Configure SQL views to enable metadata analysis in your DHIS2 instance
        </p>
        <div className="mt-4 text-sm">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {totalConfigured} of {templates.length} templates configured
          </span>
        </div>
      </div>

      {/* DHIS2 Version Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select your DHIS2 Version:
        </label>
        <select 
          value={dhisVersion}
          onChange={(e) => setDhisVersion(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="2.40">DHIS2 2.40</option>
          <option value="2.41">DHIS2 2.41</option>
          <option value="2.42">DHIS2 2.42</option>
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('configure')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'configure'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Configuration
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'discover'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Discover & Map Existing
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'configure' && <SqlViewConfiguration />}
      {activeTab === 'discover' && <SqlViewDiscovery />}
    </div>
  );
} 