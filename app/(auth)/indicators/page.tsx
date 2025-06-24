'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MetadataTable, MetadataFilters } from '@/components/features/metadata';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMetadata } from '../../../hooks/useMetadata';
import { useFilters } from '../../../hooks/useFilters';
import { ExportButton } from '@/components/shared/ExportButton';
import { ExportFormat, ExportService } from '../../../lib/export';
import { METADATA_TYPES } from '../../../lib/constants';
import { SqlViewDataDisplay } from '@/components/features/sql-views';
import EnhancedSqlViewTable from '@/src/components/features/sql-views/EnhancedSqlViewTable';
import SavedMetadataManager from '@/components/metadata/SavedMetadataManager';

export default function IndicatorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, username, dhisBaseUrl, authToken } = useAuthStore();
  const [groupOptions, setGroupOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<'standard' | 'debug' | 'enhanced' | 'saved'>('standard');
  const [showFilters, setShowFilters] = useState(false);
  const [testSqlViewId, setTestSqlViewId] = useState('ReUHfIn0pTQ'); // Default indicators SQL view

  // Initialize filters from URL search params
  const initialFilters = {
    search: searchParams.get('search') || '',
    type: searchParams.get('type')?.split(',') || [],
    group: searchParams.get('group')?.split(',') || [],
    qualityScore: searchParams.get('quality')?.split(',').map(Number) || [],
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 50,
    sortBy: searchParams.get('sortBy') || 'displayName',
    sortDirection: (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc',
  };

  // Initialize filter hooks
  const { filters, setFilters, resetFilters, parseFiltersFromUrl } = useFilters(initialFilters);

  // Create session object from auth store data
  const session = isAuthenticated ? {
    id: 'local-session',
    userId: username || 'user',
    serverUrl: dhisBaseUrl || '',
    username: username || '',
    displayName: username || '',
    token: authToken || '',
    expiresAt: '',
    lastUsed: new Date().toISOString()
  } : null;

  // Use metadata hook to fetch indicators
  const {
    metadata,
    isLoading,
    error,
    pagination,
    updateFilters,
    fetchMetadata,
  } = useMetadata(METADATA_TYPES.INDICATOR, session, filters);

  // Update filters when URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      parseFiltersFromUrl(url);
    }
  }, [searchParams, parseFiltersFromUrl]);

  // Fetch group options for filtering
  useEffect(() => {
    const fetchGroups = async () => {
      if (!session) return;
      
      try {
        setGroupOptions([
          { id: 'group1', name: 'Health Indicators' },
          { id: 'group2', name: 'Demographic Indicators' },
          { id: 'group3', name: 'Service Coverage' },
          { id: 'group4', name: 'Quality Metrics' },
        ]);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    
    fetchGroups();
  }, [session]);

  // Handle page change
  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    updateFilters({ pageSize });
  };

  // Handle sort change
  const handleSortChange = (sortBy: string, sortDirection: 'asc' | 'desc') => {
    updateFilters({ sortBy, sortDirection });
  };

  // Handle filter change
  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
  };

  // Handle export
  const handleExport = (format: ExportFormat, includeQuality: boolean) => {
    if (!metadata || metadata.length === 0) return;
    
    const metadataItems = metadata.map(item => item.metadata);
    const qualityItems = includeQuality ? metadata.map(item => item.quality) : undefined;
    
    const exportContent = ExportService.exportMetadataList(
      metadataItems,
      qualityItems,
      {
        format,
        includeQuality,
        filename: `indicators_export_${new Date().toISOString().split('T')[0]}`
      }
    );
    
    // Create a downloadable link
    const url = ExportService.createDownloadLink(
      exportContent,
      `indicators_export_${new Date().toISOString().split('T')[0]}`,
      format
    );
    
    // Create a temporary anchor and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `indicators_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Indicators</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Mobile filter toggle */}
            <div className="sm:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
            
            <ExportButton
              onExport={handleExport}
              disabled={isLoading || metadata.length === 0}
            />
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b mb-6 bg-white rounded-t-lg">
          <nav className="flex space-x-6 px-6 pt-4">
            <button
              onClick={() => setActiveTab('standard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'standard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Standard View
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'debug'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🔍 SQL Debug & Generation
            </button>
            <button
              onClick={() => setActiveTab('enhanced')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'enhanced'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🚀 Enhanced Multi-Page Analysis
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💾 Saved Metadata Dictionaries
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">
                🔍 SQL View Debug & Manual Table Generation
              </h2>
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                <p className="text-green-800 text-sm mb-2">
                  <strong>📋 Debug Mode:</strong> View raw JSON responses and manually generate tables when automatic loading fails.
                </p>
                <p className="text-green-700 text-xs">
                  <strong>🎯 Use Case:</strong> When metadata shows "Rows: 0" but JSON data is returned, use "Generate Table" to create interactive tables.
                </p>
              </div>
              <SqlViewDataDisplay category="indicators" />
            </div>
          </div>
        )}

        {activeTab === 'enhanced' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">
                🚀 Enhanced Multi-Page SQL View Analysis
              </h2>
              <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
                <p className="text-purple-800 text-sm mb-2">
                  <strong>⚡ Advanced Features:</strong> Multi-page data fetching, real-time progress tracking, interactive filtering, and CSV export.
                </p>
                <p className="text-purple-700 text-xs">
                  <strong>📊 Capabilities:</strong> Automatically fetches ALL pages from DHIS2 API responses with smart column detection and batch processing.
                </p>
              </div>
              
              {/* SQL View Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-3">SQL View Configuration</h3>
                <div className="flex space-x-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Indicators SQL View ID
                    </label>
                    <input
                      type="text"
                      value={testSqlViewId}
                      onChange={(e) => setTestSqlViewId(e.target.value)}
                      className="w-full border border-blue-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter SQL View UID for indicators"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Default: ReUHfIn0pTQ (DHIS2 demo indicators view)
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply & Refresh
                  </button>
                </div>
              </div>

              {/* Enhanced SQL View Table */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">
                    🚀 Enhanced Multi-Page Indicators Analysis
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Advanced SQL view analysis with multi-page fetching, interactive filtering, and export capabilities
                  </p>
                </div>
                <div className="p-4">
                  <EnhancedSqlViewTable
                    sqlViewId={testSqlViewId}
                    initialBatchSize={50}
                    maxRows={5000}
                    autoLoad={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-6">
                <p className="text-orange-800 text-sm mb-2">
                  <strong>📚 Saved Analyses:</strong> Store and retrieve generated metadata dictionary tables with names, dates, and configurations.
                </p>
                <p className="text-orange-700 text-xs">
                  <strong>💡 Features:</strong> Version history, export options, and collaborative sharing of metadata analysis results.
                </p>
              </div>
              
              <SavedMetadataManager 
                category="indicators"
                onLoad={(entry) => {
                  console.log('Loading saved entry:', entry);
                  alert(`Loading: ${entry.name}\n\nThis would restore the saved analysis with ${entry.metadata.rowCount} rows.`);
                }}
              />
            </div>
          </div>
        )}
        
        {/* Standard View Tab */}
        {activeTab === 'standard' && (
          <div className="flex flex-col lg:flex-row lg:gap-6">
            {/* Filters sidebar - desktop */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-4">
                <MetadataFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={resetFilters}
                  groupOptions={groupOptions}
                />
              </div>
            </div>
            
            {/* Filters sidebar - mobile (collapsible) */}
            {showFilters && (
              <div className="lg:hidden mb-6">
                <MetadataFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={resetFilters}
                  groupOptions={groupOptions}
                />
              </div>
            )}
            
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {error ? (
                  <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MetadataTable
                    data={metadata}
                    basePath="/indicators"
                    isLoading={isLoading}
                    pagination={pagination}
                    filters={filters}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onSortChange={handleSortChange}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}