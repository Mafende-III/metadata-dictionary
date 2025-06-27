'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { InstanceService, DHIS2Instance } from '@/lib/services/instanceService';
import SqlViewDataDisplay from '@/src/components/features/sql-views/SqlViewDataDisplay';

interface SqlView {
  id: string;
  uid: string;
  name: string;
  description: string;
  type: 'MATERIALIZED_VIEW' | 'VIEW' | 'QUERY';
  instance: string;
  instanceBadge: string;
  endpoint: string;
  columns: number;
  category: 'aggregate' | 'tracker' | 'event';
  version: string;
}

const mockSqlViews: SqlView[] = [
  {
    id: '1',
    uid: 'YN8eFwDcO0r',
    name: 'Active Data Elements',
    description: 'Data elements updated in last 6 months with quality scores',
    type: 'MATERIALIZED_VIEW',
    instance: 'demo',
    instanceBadge: 'Demo DHIS2',
    endpoint: '/api/sqlViews/YN8eFwDcO0r/data.json',
    columns: 12,
    category: 'aggregate',
    version: 'v2.40+'
  },
  {
    id: '2',
    uid: 'ABC123XYZ',
    name: 'Data Element Completeness',
    description: 'Completeness assessment with disaggregations',
    type: 'MATERIALIZED_VIEW',
    instance: 'demo',
    instanceBadge: 'Demo DHIS2',
    endpoint: '/api/sqlViews/ABC123XYZ/data.json',
    columns: 8,
    category: 'aggregate',
    version: 'v2.40+'
  },
  {
    id: '3',
    uid: 'TRK123ABC',
    name: 'Tracked Entity Attributes',
    description: 'All TEAs with value types and option sets',
    type: 'MATERIALIZED_VIEW',
    instance: 'production',
    instanceBadge: 'Production',
    endpoint: '/api/sqlViews/TRK123ABC/data.json',
    columns: 10,
    category: 'tracker',
    version: 'v2.40+'
  },
  {
    id: '4',
    uid: 'IND456ABC',
    name: 'Indicators with Formulas',
    description: 'All indicators with numerator/denominator formulas',
    type: 'MATERIALIZED_VIEW',
    instance: 'demo',
    instanceBadge: 'Demo DHIS2',
    endpoint: '/api/sqlViews/IND456ABC/data.json',
    columns: 15,
    category: 'aggregate',
    version: 'v2.40+'
  }
];

export default function SqlViewsPage() {
  const router = useRouter();
  const { isAuthenticated, dhisBaseUrl } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'available' | 'create' | 'guide'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [filteredViews, setFilteredViews] = useState<SqlView[]>(mockSqlViews);
  
  // Instances state
  const [instances, setInstances] = useState<DHIS2Instance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create new SQL view form state
  const [newSqlView, setNewSqlView] = useState({
    name: '',
    instance: '',
    dataType: 'aggregate',
    viewType: 'materialized',
    sqlQuery: ''
  });

  const [testSqlViewId, setTestSqlViewId] = useState('w1JM5arbLNJ');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    loadInstances();
  }, [isAuthenticated, router]);

  const loadInstances = async () => {
    try {
      setLoadingInstances(true);
      setError(null);
      const data = await InstanceService.getInstances();
      const connectedInstances = data.filter(instance => instance.status === 'connected');
      setInstances(connectedInstances);
      
      if (connectedInstances.length === 0) {
        setError('No connected instances found. Please add and connect a DHIS2 instance first.');
      }
    } catch (err) {
      console.error('Error loading instances:', err);
      setError('Failed to load instances. Please try again.');
      setInstances([]);
    } finally {
      setLoadingInstances(false);
    }
  };

  useEffect(() => {
    let filtered = mockSqlViews;

    if (searchQuery) {
      filtered = filtered.filter(view => 
        view.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        view.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedInstance) {
      filtered = filtered.filter(view => view.instance === selectedInstance);
    }

    if (selectedType) {
      filtered = filtered.filter(view => view.category === selectedType);
    }

    if (selectedVersion) {
      filtered = filtered.filter(view => view.version === selectedVersion);
    }

    setFilteredViews(filtered);
  }, [searchQuery, selectedInstance, selectedType, selectedVersion]);

  const clearAllCaches = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
      console.log('✅ Cleared all browser storage');
    }
    alert('Cache cleared successfully!');
  };

  const testSqlView = (uid: string) => {
    router.push(`/sql-views/demo?id=${uid}`);
  };

  const handleCreateSqlView = () => {
    console.log('Creating new SQL view:', newSqlView);
    alert('SQL View creation would be implemented here. This will connect to DHIS2 API to create the SQL view.');
  };

  const getBadgeColor = (instance: string) => {
    switch (instance) {
      case 'demo': return 'bg-blue-100 text-blue-800';
      case 'production': return 'bg-green-100 text-green-800';
      case 'training': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedViews = {
    aggregate: filteredViews.filter(view => view.category === 'aggregate'),
    tracker: filteredViews.filter(view => view.category === 'tracker'),
    event: filteredViews.filter(view => view.category === 'event')
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="warning">
          Please sign in to access SQL views.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 page-transition">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SQL View Configurations</h1>
          <p className="text-gray-600 mt-1">Manage and configure SQL views for metadata dictionary generation</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={clearAllCaches}
            variant="outline"
            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
          >
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadInstances}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Available SQL Views
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuration Guide
          </button>
        </nav>
      </div>

      {/* Available SQL Views Tab */}
      {activeTab === 'available' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search SQL views..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={selectedInstance}
                  onChange={(e) => setSelectedInstance(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingInstances}
                >
                  <option value="">All Instances</option>
                  {instances.map(instance => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} {instance.version ? `(${instance.version})` : ''}
                    </option>
                  ))}
                  {instances.length === 0 && !loadingInstances && (
                    <option disabled>No connected instances</option>
                  )}
                  {loadingInstances && (
                    <option disabled>Loading instances...</option>
                  )}
                </select>
              </div>
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="aggregate">Aggregate</option>
                  <option value="tracker">Tracker</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Versions</option>
                  <option value="v2.40+">v2.40+</option>
                  <option value="v2.39">v2.39</option>
                  <option value="v2.38">v2.38</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Quick Test Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick SQL View Test</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL View ID to Test
                </label>
                <input
                  type="text"
                  value={testSqlViewId}
                  onChange={(e) => setTestSqlViewId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter SQL View UID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: w1JM5arbLNJ (from DHIS2 demo - replace with your SQL View ID)
                </p>
              </div>
              <Button
                onClick={() => testSqlView(testSqlViewId)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Test Enhanced SQL View Table
              </Button>
            </div>
          </Card>

          {/* Live SQL View Execution with Terminate Button */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🔄 Live SQL View Execution
              <span className="ml-2 text-sm font-normal text-gray-500">(with terminate control)</span>
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Execute SQL views directly with full control including terminate button, filtering, and parameter support.
              </p>
              <SqlViewDataDisplay 
                category="data_elements"
                filter={{}}
              />
            </div>
          </Card>

          {/* Grouped SQL Views */}
          <div className="space-y-8">
            {/* Aggregate Data */}
            {groupedViews.aggregate.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  📊 Aggregate Data (v2.40+)
                </h3>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SQL View Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Instance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            API Endpoint
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Columns
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedViews.aggregate.map((view) => (
                          <tr key={view.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{view.name}</div>
                                <div className="text-sm text-gray-500">{view.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">{view.uid}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(view.instance)}`}>
                                {view.instanceBadge}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-xs text-gray-600">{view.endpoint}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {view.columns}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button
                                size="sm"
                                onClick={() => testSqlView(view.uid)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Test
                              </Button>
                              <Button size="sm" variant="outline">Edit</Button>
                              <Button size="sm" variant="outline">Clone</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Tracker Data */}
            {groupedViews.tracker.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  🎯 Tracker Data (v2.40+)
                </h3>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SQL View Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Instance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            API Endpoint
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Columns
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedViews.tracker.map((view) => (
                          <tr key={view.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{view.name}</div>
                                <div className="text-sm text-gray-500">{view.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">{view.uid}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(view.instance)}`}>
                                {view.instanceBadge}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-xs text-gray-600">{view.endpoint}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {view.columns}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button
                                size="sm"
                                onClick={() => testSqlView(view.uid)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Test
                              </Button>
                              <Button size="sm" variant="outline">Edit</Button>
                              <Button size="sm" variant="outline">Clone</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {filteredViews.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">🔍</div>
                <p className="text-gray-500">No SQL views found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New SQL View Tab */}
      {activeTab === 'create' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Create New SQL View</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL View Name
                </label>
                <input
                  type="text"
                  value={newSqlView.name}
                  onChange={(e) => setNewSqlView(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Active Indicators with Formulas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Instance
                </label>
                <select
                  value={newSqlView.instance}
                  onChange={(e) => setNewSqlView(prev => ({ ...prev, instance: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingInstances}
                >
                  <option value="">Select Instance</option>
                  {instances.map(instance => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} {instance.version ? `(${instance.version})` : ''}
                    </option>
                  ))}
                  {instances.length === 0 && !loadingInstances && (
                    <option disabled>No connected instances available</option>
                  )}
                  {loadingInstances && (
                    <option disabled>Loading instances...</option>
                  )}
                </select>
                {instances.length === 0 && !loadingInstances && (
                  <div className="mt-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">⚠️ No instances available</p>
                    <p>You need to add and connect a DHIS2 instance before creating SQL views.</p>
                    <div className="mt-2">
                      <a href="/instances" className="text-blue-600 hover:underline">
                        → Go to Instances page to add one
                      </a>
                    </div>
                    <p className="text-xs mt-2">
                      If you see database errors, check the <code>DATABASE_SETUP.md</code> file for setup instructions.
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type
                </label>
                <select
                  value={newSqlView.dataType}
                  onChange={(e) => setNewSqlView(prev => ({ ...prev, dataType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="aggregate">Aggregate</option>
                  <option value="tracker">Tracker</option>
                  <option value="event">Event</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View Type
                </label>
                <select
                  value={newSqlView.viewType}
                  onChange={(e) => setNewSqlView(prev => ({ ...prev, viewType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="materialized">Materialized View (Cached)</option>
                  <option value="query">Query (Real-time)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Version Info Display */}
              {newSqlView.instance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instance Information
                  </label>
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    {(() => {
                      const selectedInstance = instances.find(inst => inst.id === newSqlView.instance);
                      return selectedInstance ? (
                        <div>
                          <p className="font-medium mb-1">📡 Connected Instance: {selectedInstance.name}</p>
                          <p>🔗 URL: {selectedInstance.base_url}</p>
                          {selectedInstance.version && (
                            <p>⚙️ Version: {selectedInstance.version} (auto-detected)</p>
                          )}
                          <p className="text-xs mt-2 text-blue-600">
                            ✅ Version will be auto-detected from instance - no manual selection needed
                          </p>
                        </div>
                      ) : (
                        <p>Select an instance to see version information</p>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Columns
                </label>
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                  <p className="font-medium mb-2">⚠️ Each SQL view must include:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>UID column (system identifier)</li>
                    <li>Name/display column</li>
                    <li>Analytics API URL column</li>
                    <li>Period column (if applicable)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SQL Query
            </label>
            <textarea
              value={newSqlView.sqlQuery}
              onChange={(e) => setNewSqlView(prev => ({ ...prev, sqlQuery: e.target.value }))}
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder={`WITH active_indicators AS (
    SELECT 
        i.uid AS indicator_uid,
        i.name AS indicator_name,
        i.indicatortype AS indicator_type,
        i.numerator AS numerator_formula,
        i.denominator AS denominator_formula,
        i.annualized AS is_annualized,
        i.lastupdated AS last_updated,
        CONCAT('/api/analytics?dimension=dx:', i.uid, '&dimension=pe:LAST_12_MONTHS&dimension=ou:LEVEL-1') AS analytics_api_url,
        'Q1 2025' AS period,
        CASE 
            WHEN i.numerator IS NOT NULL AND i.denominator IS NOT NULL THEN 100
            WHEN i.numerator IS NOT NULL OR i.denominator IS NOT NULL THEN 75
            ELSE 50
        END AS quality_score
    FROM indicators i
    WHERE i.lastupdated > NOW() - INTERVAL '6 months'
)
SELECT * FROM active_indicators
ORDER BY last_updated DESC;`}
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={handleCreateSqlView} className="bg-blue-600 hover:bg-blue-700">
              Save SQL View
            </Button>
            <Button variant="outline">Test Query</Button>
            <Button variant="outline" onClick={() => setNewSqlView({
              name: '',
              instance: '',
              dataType: 'aggregate',
              viewType: 'materialized',
              sqlQuery: ''
            })}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Configuration Guide Tab */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              📖 SQL View Configuration Guide
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Overview</h3>
                <p className="text-gray-700">
                  SQL Views in DHIS2 allow you to create custom queries against the database to generate metadata dictionaries. 
                  Each SQL view is assigned a unique identifier (UID) and can be accessed via the DHIS2 API.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Concepts</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">1. SQL View UID</h4>
                    <p className="text-gray-700">
                      Each SQL view gets a unique 11-character identifier (e.g., YN8eFwDcO0r) that is used to access it via the API.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">2. API Endpoint Generation</h4>
                    <p className="text-gray-700">
                      Once configured, the API endpoint is: <code className="bg-white px-2 py-1 rounded">{`{instance}/api/sqlViews/{UID}/data.json`}</code>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">3. Analytics API URL</h4>
                    <p className="text-gray-700">
                      Each variable should include a column with its analytics API URL for accessing data values.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Required Columns</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Example</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded">uid</code>
                        </td>
                        <td className="px-6 py-4">Unique identifier of the metadata object</td>
                        <td className="px-6 py-4">fbfJHSPpUQD</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded">name</code>
                        </td>
                        <td className="px-6 py-4">Display name of the metadata object</td>
                        <td className="px-6 py-4">ANC 1st visit</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded">analytics_api_url</code>
                        </td>
                        <td className="px-6 py-4">API endpoint for data values</td>
                        <td className="px-6 py-4">/api/analytics?dimension=dx:fbfJHSPpUQD</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded">period</code>
                        </td>
                        <td className="px-6 py-4">Time period for the dictionary</td>
                        <td className="px-6 py-4">Q1 2025</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Example SQL Views by Type</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Aggregate Data Elements (v2.40+)</h4>
                    <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre>{`SELECT 
    de.uid AS data_element_uid,
    de.name AS data_element_name,
    de.valuetype AS value_type,
    cc.name AS category_combo,
    CONCAT('/api/analytics?dimension=dx:', de.uid, '&dimension=pe:2025Q1') AS analytics_api_url,
    '2025Q1' AS period
FROM dataelement de
LEFT JOIN categorycombo cc ON de.categorycomboid = cc.categorycomboid
WHERE de.domaintype = 'AGGREGATE';`}</pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Tracker Attributes (v2.40+)</h4>
                    <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre>{`SELECT 
    tea.uid AS attribute_uid,
    tea.name AS attribute_name,
    tea.valuetype AS value_type,
    CONCAT('/api/trackedEntityAttributes/', tea.uid) AS analytics_api_url
FROM trackedentityattribute tea
WHERE tea.active = true;`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6 bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-3">System Status</h3>
            <div className="space-y-2 text-sm text-green-800">
              <p>• <strong>Connected to:</strong> {dhisBaseUrl}</p>
              <p>• <strong>Authentication:</strong> ✅ Active session</p>
              <p>• <strong>Enhanced Features:</strong> ✅ Multi-page fetching, debugging tools, export capabilities</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}