'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { MetadataGroupFilter } from '@/components/features/metadata';
import { ProcessingStats, ProcessingQueue, QueueItem } from '@/components/features/processing';
import EnhancedSqlViewTable from '@/src/components/features/sql-views/EnhancedSqlViewTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { ExportButton } from '@/components/shared/ExportButton';
import { ExportFormat, ExportOptions } from '../../../lib/export';

interface DataElementGroup {
  id: string;
  name: string;
  dataElements: number;
}

interface SystemStats {
  totalDataElements: number;
  groups: number;
  lastUpdated: string;
  qualityAverage: number;
}

export default function DataElementsPage() {
  const { isAuthenticated, dhisBaseUrl, authToken } = useAuthStore();
  
  // State management
  const [activeView, setActiveView] = useState<'explore' | 'generate' | 'saved'>('explore');
  const [dataElementGroups, setDataElementGroups] = useState<DataElementGroup[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [processingMethod, setProcessingMethod] = useState<'batch' | 'individual'>('batch');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<QueueItem[]>([]);
  const [processingStats, setProcessingStats] = useState({
    avgProcessTime: 0,
    successRate: 0,
    itemsPerMinute: 0,
    remainingTime: '--'
  });
  const [sqlViewId, setSqlViewId] = useState('w1JM5arbLNJ'); // Default DHIS2 data elements SQL view
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Terminate/Cancel processing
  const cancelProcessing = async () => {
    if (isProcessing) {
      console.log('🛑 Cancelling data elements processing');
      setIsProcessing(false);
      
      // Cancel any active processing jobs
      const activeItems = processingQueue.filter(item => item.status === 'processing');
      
      for (const item of activeItems) {
        try {
          console.log(`🛑 Cancelling processing for item: ${item.id}`);
          
          const cancelResponse = await fetch(`/api/dictionaries/${item.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'cancel'
            })
          });
          
          if (cancelResponse.ok) {
            console.log(`✅ Successfully cancelled processing for: ${item.id}`);
          } else {
            console.warn(`⚠️ Failed to cancel processing for: ${item.id}`);
          }
        } catch (error) {
          console.error(`❌ Error cancelling processing for ${item.id}:`, error);
        }
      }
      
      setProcessingQueue(prev => prev.map(item => ({
        ...item,
        status: item.status === 'processing' ? 'error' : item.status,
        error: item.status === 'processing' ? 'Cancelled by user' : item.error
      })));
      setError('Processing was cancelled');
    }
  };

  // Fetch real data from DHIS2 API
  useEffect(() => {
    // Only fetch data when user is authenticated and actively viewing the page
    if (isAuthenticated && dhisBaseUrl && authToken && activeView === 'explore') {
      fetchSystemData();
    }
  }, [isAuthenticated, dhisBaseUrl, authToken, activeView]);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data element groups with proper error handling
      try {
        console.log('🔍 Fetching data element groups with:', { dhisBaseUrl, authToken: authToken ? 'present' : 'missing' });
        
        const groupsResponse = await fetch('/api/dhis2/proxy?path=/dataElementGroups.json?fields=id,name,dataElements~size&pageSize=100', {
          headers: {
            'Authorization': `Basic ${authToken}`,
            'x-dhis2-base-url': dhisBaseUrl,
            'Accept': 'application/json',
          }
        });

        console.log('📊 Groups response status:', groupsResponse.status);
        
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          console.log('📊 Groups data received:', groupsData);
          
          const groups = groupsData.dataElementGroups?.map((group: any) => ({
            id: group.id,
            name: group.name,
            dataElements: group.dataElements || 0
          })) || [];
          
          console.log('📊 Processed groups:', groups);
          setDataElementGroups(groups);
          
          // Update system stats with group count
          setSystemStats(prev => prev ? { ...prev, groups: groups.length } : null);
        } else {
          const errorData = await groupsResponse.text();
          console.warn('Failed to fetch data element groups:', groupsResponse.status, errorData);
        }
      } catch (groupError) {
        console.warn('Error fetching data element groups:', groupError);
      }

      // Fetch system statistics with proper error handling
      try {
        const statsResponse = await fetch('/api/dhis2/proxy?path=/dataElements.json?fields=id&pageSize=1', {
          headers: {
            'Authorization': `Basic ${authToken}`,
            'x-dhis2-base-url': dhisBaseUrl,
            'Accept': 'application/json',
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setSystemStats({
            totalDataElements: statsData.pager?.total || 0,
            groups: dataElementGroups.length,
            lastUpdated: new Date().toISOString(),
            qualityAverage: 87 // This would come from quality assessment
          });
        } else {
          console.warn('Failed to fetch data elements stats:', statsResponse.status);
          // Set default stats if API fails
          setSystemStats({
            totalDataElements: 0,
            groups: dataElementGroups.length,
            lastUpdated: new Date().toISOString(),
            qualityAverage: 87
          });
        }
      } catch (statsError) {
        console.warn('Error fetching data elements stats:', statsError);
        // Set default stats if API fails
        setSystemStats({
          totalDataElements: 0,
          groups: dataElementGroups.length,
          lastUpdated: new Date().toISOString(),
          qualityAverage: 87
        });
      }

    } catch (err) {
      console.error('Error fetching system data:', err);
      setError('Failed to load system data. Please check your connection.');
      // Set default stats on error
      setSystemStats({
        totalDataElements: 0,
        groups: 0,
        lastUpdated: new Date().toISOString(),
        qualityAverage: 87
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId: string, itemCount: number) => {
    setSelectedGroup(groupId);
    // Auto-adjust processing method for large datasets
    if (itemCount > 500 && !groupId) {
      setProcessingMethod('individual');
    }
  };

  const handleProcessingMethodChange = (method: 'batch' | 'individual') => {
    setProcessingMethod(method);
  };

  const updateProcessingStats = (stats: typeof processingStats) => {
    setProcessingStats(stats);
  };

  const handleExport = (format: ExportFormat, options: ExportOptions) => {
    // Export functionality would be implemented here
    console.log('Export requested:', { format, options });
    alert(`Export to ${format.toUpperCase()} ${options.includeQuality ? 'with quality scores' : ''} - Feature coming soon!`);
  };

  const handleGenerateNewDictionary = () => {
    setActiveView('generate');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="warning">
          Please sign in to access data elements.
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading data elements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Elements</h1>
            <p className="text-gray-600 mt-2">
              Explore and manage metadata dictionaries for data elements
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchSystemData()}
              variant="outline"
              disabled={loading}
              className="text-gray-600 hover:text-gray-700"
            >
              {loading ? '🔄' : '🔄'} Refresh Data
            </Button>
            <ExportButton
              onExport={handleExport}
              disabled={false}
            />
            <Button
              onClick={handleGenerateNewDictionary}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ➕ Generate New Dictionary
            </Button>
          </div>
        </div>

        {/* System Statistics */}
        {systemStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-4 border-l-4 border-blue-600">
              <div className="text-2xl font-bold text-gray-800">{systemStats.totalDataElements.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Data Elements</div>
            </Card>
            <Card className="p-4 border-l-4 border-green-600">
              <div className="text-2xl font-bold text-gray-800">{dataElementGroups.length}</div>
              <div className="text-sm text-gray-600">Data Element Groups</div>
            </Card>
            <Card className="p-4 border-l-4 border-purple-600">
              <div className="text-2xl font-bold text-gray-800">{systemStats.qualityAverage}%</div>
              <div className="text-sm text-gray-600">Avg Quality Score</div>
            </Card>
            <Card className="p-4 border-l-4 border-orange-600">
              <div className="text-2xl font-bold text-gray-800">
                {new Date(systemStats.lastUpdated).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Last Updated</div>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveView('explore')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'explore'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 Explore Dictionaries
            </button>
            <button
              onClick={() => setActiveView('generate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'generate'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ➕ Generate New
            </button>
            <button
              onClick={() => setActiveView('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'saved'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💾 Saved Dictionaries
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-6 p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">🔧 Debug Information</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
            <p><strong>DHIS2 URL:</strong> {dhisBaseUrl || 'Not set'}</p>
            <p><strong>Auth Token:</strong> {authToken ? '✅ Present' : '❌ Missing'}</p>
            <p><strong>Active View:</strong> {activeView}</p>
            <p><strong>Loading:</strong> {loading ? '🔄 Yes' : '✅ No'}</p>
            <p><strong>Groups Count:</strong> {dataElementGroups.length}</p>
            <p><strong>System Stats:</strong> {systemStats ? `${systemStats.totalDataElements} elements` : 'Not loaded'}</p>
          </div>
        </Card>
      )}

      {/* Explore Dictionaries View */}
      {activeView === 'explore' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Filter Data Elements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search data elements..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Score
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Quality Levels</option>
                  <option value="excellent">Excellent (90-100%)</option>
                  <option value="good">Good (70-89%)</option>
                  <option value="fair">Fair (50-69%)</option>
                  <option value="poor">Poor (0-49%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL View ID
                </label>
                <input
                  type="text"
                  value={sqlViewId}
                  onChange={(e) => setSqlViewId(e.target.value)}
                  placeholder="Enter SQL View UID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Group-Based Filtering */}
            <div className="border-t pt-6">
              <h3 className="text-md font-medium mb-4">Advanced Group Filtering</h3>
              <MetadataGroupFilter
                metadataType="dataElements"
                onGroupSelect={handleGroupSelect}
                onProcessingMethodChange={handleProcessingMethodChange}
              />
            </div>
          </Card>

          {/* Processing Statistics */}
          {isProcessing && (
            <div className="space-y-4">
              <ProcessingStats 
                {...processingStats} 
                isProcessing={isProcessing}
                onTerminate={cancelProcessing}
              />
              <ProcessingQueue 
                items={processingQueue}
                maxVisible={10}
                isProcessing={isProcessing}
                onTerminate={cancelProcessing}
              />
            </div>
          )}

          {/* Enhanced Data Table */}
          <Card className="overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Data Elements Analysis
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedGroup 
                  ? `Filtered by group • ${processingMethod} processing`
                  : `All data elements • ${processingMethod} processing`
                }
              </p>
            </div>
            <div className="p-6">
              <EnhancedSqlViewTable
                sqlViewId={sqlViewId}
                groupId={selectedGroup}
                processingMethod={processingMethod}
                onStatsUpdate={updateProcessingStats}
                initialBatchSize={50}
                maxRows={5000}
                autoLoad={true}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Generate New Dictionary View */}
      {activeView === 'generate' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Generate New Data Elements Dictionary</h2>
            <Alert variant="info" className="mb-6">
              <div>
                <strong>Dictionary Generation:</strong> Create a comprehensive metadata dictionary 
                with group-based filtering and individual processing to prevent timeouts.
              </div>
            </Alert>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dictionary Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Q1 2025 Data Elements Dictionary"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Data Element Group
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Data Elements</option>
                    {dataElementGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.dataElements} elements)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Generation Options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Include quality scores</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Fetch detailed descriptions</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">Include inactive elements</span>
                    </label>
                  </div>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700">
                  🚀 Generate Dictionary
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Generation Preview</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• <strong>Total Elements:</strong> {systemStats?.totalDataElements.toLocaleString() || 0}</p>
                  <p>• <strong>Available Groups:</strong> {dataElementGroups.length}</p>
                  <p>• <strong>Processing Method:</strong> Individual (prevents timeouts)</p>
                  <p>• <strong>Estimated Time:</strong> 5-15 minutes</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Saved Dictionaries View */}
      {activeView === 'saved' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Saved Data Elements Dictionaries</h2>
            
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Saved Dictionaries</h3>
              <p className="text-gray-500 mb-4">
                Generate your first dictionary to save and manage metadata analyses.
              </p>
              <Button
                onClick={() => setActiveView('generate')}
                variant="outline"
              >
                Generate First Dictionary
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 