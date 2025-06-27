'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import Alert from '@/src/components/ui/Alert';
import { DictionaryService, MetadataDictionary } from '@/lib/services/dictionaryService';

export default function DictionariesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [dictionaries, setDictionaries] = useState<MetadataDictionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalVariables: 0,
    instances: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    instance: 'all',
    type: 'all',
    period: 'all'
  });

  // Load real data from Supabase
  useEffect(() => {
    loadDictionaries();
    loadStats();
  }, []);

  const loadDictionaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DictionaryService.getDictionaries();
      setDictionaries(data);
    } catch (err) {
      console.error('Error loading dictionaries:', err);
      setError('Failed to load dictionaries. Please try again.');
      setDictionaries([]); // Show empty state instead of crashing
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await DictionaryService.getDictionaryStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
      // Don't show error for stats, just use defaults
    }
  };

  const filteredDictionaries = dictionaries.filter(dict => {
    const matchesSearch = dict.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         (dict.description || '').toLowerCase().includes(filters.search.toLowerCase());
    const matchesInstance = filters.instance === 'all' || dict.instance_name === filters.instance;
    const matchesType = filters.type === 'all' || dict.metadata_type === filters.type;
    const matchesPeriod = filters.period === 'all' || (dict.period || '').includes(filters.period);
    
    return matchesSearch && matchesInstance && matchesType && matchesPeriod;
  });

  // Get unique instances for filter dropdown
  const availableInstances = [...new Set(dictionaries.map(d => d.instance_name))];

  const handleViewDictionary = (dictId: string) => {
    router.push(`/dictionaries/${dictId}`);
  };

  const handleUpdateDictionary = async (dictId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to update dictionaries');
      return;
    }
    
    try {
      await DictionaryService.generateNewVersion(dictId);
      alert('Dictionary update started. This will create a new version');
      loadDictionaries(); // Refresh the list
    } catch (err) {
      alert('Failed to update dictionary: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleGenerateNew = () => {
    if (!isAuthenticated) {
      alert('Please sign in to generate new dictionaries');
      return;
    }
    router.push('/generate');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'generating':
        return <span className="badge badge-warning">Generating...</span>;
      case 'error':
        return <span className="badge badge-danger">Error</span>;
      default:
        return <span className="badge badge-primary">{status}</span>;
    }
  };

  const getInstanceBadge = (instance: string) => {
    // Generate consistent badge colors for instances
    const colors = ['badge-primary', 'badge-success', 'badge-info', 'badge-warning'];
    const index = instance.length % colors.length;
    return <span className={`badge ${colors[index]}`}>{instance}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 page-transition">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Metadata Dictionaries</h1>
            <p className="text-gray-600 mt-2">
              Browse and manage your metadata dictionaries across all connected instances
            </p>
          </div>
          <Button
            onClick={handleGenerateNew}
            className="bg-blue-600 hover:bg-blue-700"
          >
            ➕ Generate New Dictionary
          </Button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-4 border-l-4 border-blue-600">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Dictionaries</div>
          </Card>
          <Card className="p-4 border-l-4 border-green-600">
            <div className="text-2xl font-bold text-gray-800">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </Card>
          <Card className="p-4 border-l-4 border-orange-600">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalVariables.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Variables</div>
          </Card>
          <Card className="p-4 border-l-4 border-purple-600">
            <div className="text-2xl font-bold text-gray-800">{stats.instances}</div>
            <div className="text-sm text-gray-600">Connected Instances</div>
          </Card>
        </div>

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <Alert variant="info" className="mb-6">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div>
                <strong>Browse Mode:</strong> You're viewing existing dictionaries. 
                <button 
                  onClick={() => router.push('/')}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Sign in
                </button> to generate new dictionaries or update existing ones.
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadDictionaries}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Dictionaries</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search dictionaries..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instance
            </label>
            <select
              value={filters.instance}
              onChange={(e) => setFilters(prev => ({ ...prev, instance: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Instances</option>
              {availableInstances.map(instance => (
                <option key={instance} value={instance}>{instance}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="dataElements">Data Elements</option>
              <option value="indicators">Indicators</option>
              <option value="programIndicators">Program Indicators</option>
              <option value="dataElementGroups">Data Element Groups</option>
              <option value="indicatorGroups">Indicator Groups</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <select
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Periods</option>
              <option value="2025">2025</option>
              <option value="Q1 2025">Q1 2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Dictionary List */}
      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Dictionary List ({filteredDictionaries.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading dictionaries...</p>
          </div>
        ) : filteredDictionaries.length === 0 ? (
          <div className="p-12 text-center">
            {/* Enhanced Empty State */}
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 text-6xl mb-6">📚</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {dictionaries.length === 0 ? 'No Metadata Dictionaries Yet' : 'No Dictionaries Match Your Filters'}
              </h3>
              
              {dictionaries.length === 0 ? (
                // First-time user experience
                <div className="space-y-4">
                  <p className="text-gray-600 text-lg mb-6">
                    Welcome! Get started by generating your first metadata dictionary from your DHIS2 instance.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold text-blue-900 mb-2">🚀 Quick Start Guide</h4>
                    <ol className="text-left text-sm text-blue-800 space-y-1">
                      <li>1. Click "Generate New Dictionary" below</li>
                      <li>2. Connect your DHIS2 instance (if not already done)</li>
                      <li>3. Configure your metadata dictionary settings</li>
                      <li>4. Process and generate your dictionary</li>
                    </ol>
                  </div>
                  
                  {isAuthenticated ? (
                    <Button 
                      onClick={handleGenerateNew} 
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      🚀 Generate Your First Dictionary
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">Please sign in to generate dictionaries</p>
                      <Button 
                        onClick={() => router.push('/')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      >
                        Sign In to Get Started
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Filtered results empty state
                <div className="space-y-4">
                  <p className="text-gray-500 mb-4">
                    No dictionaries match your current filters. Try adjusting your search criteria or create a new dictionary.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setFilters({ search: '', instance: 'all', type: 'all', period: 'all' })}
                    >
                      Clear Filters
                    </Button>
                    {isAuthenticated && (
                      <Button onClick={handleGenerateNew} className="bg-blue-600 hover:bg-blue-700">
                        ➕ Generate New Dictionary
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Help Section for Empty State */}
              <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">💡 What are Metadata Dictionaries?</h4>
                <p className="text-sm text-gray-600">
                  Comprehensive catalogs of your DHIS2 metadata (data elements, indicators, etc.) 
                  with quality scores, API endpoints, and export capabilities for easy integration.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dictionary Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variables
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDictionaries.map((dict) => (
                  <tr 
                    key={dict.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDictionary(dict.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{dict.name}</div>
                        <div className="text-sm text-gray-500">{dict.description || 'No description'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getInstanceBadge(dict.instance_name)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dict.metadata_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dict.variables_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dict.period || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dict.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(dict.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(dict.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={() => handleViewDictionary(dict.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateDictionary(dict.id)}
                          disabled={dict.status === 'generating' || !isAuthenticated}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alert('Export functionality coming soon!')}
                        >
                          Export
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          Dictionary Management Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <p>• <strong>Click any dictionary</strong> to view detailed variables and metadata</p>
            <p>• <strong>Update dictionaries</strong> to create new versions with latest data</p>
            <p>• <strong>Filter by instance</strong> to focus on specific DHIS2 environments</p>
          </div>
          <div className="space-y-2">
            <p>• <strong>Export dictionaries</strong> as CSV or JSON for external use</p>
            <p>• <strong>Version history</strong> tracks all changes and allows rollback</p>
            <p>• <strong>Search functionality</strong> helps find specific dictionaries quickly</p>
          </div>
        </div>
      </div>
    </div>
  );
} 