'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MetadataTable } from '../../../components/metadata/MetadataTable';
import { MetadataFilters } from '../../../components/metadata/MetadataFilters';
import { useDHIS2Auth } from '../../../hooks/useDHIS2Auth';
import { useMetadata } from '../../../hooks/useMetadata';
import { useFilters } from '../../../hooks/useFilters';
import { DataElement } from '../../../types/metadata';
import { ExportButton } from '../../../components/metadata/ExportButton';
import { ExportFormat, ExportService } from '../../../lib/export';
import { METADATA_TYPES } from '../../../lib/constants';
import SqlViewDataDisplay from '../../../components/metadata/SqlViewDataDisplay';

export default function DataElementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useDHIS2Auth();
  const [groupOptions, setGroupOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'sqlview'>('table');
  const [showFilters, setShowFilters] = useState(false);
  
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
  
  // Use metadata hook to fetch data elements
  const {
    metadata,
    isLoading,
    error,
    pagination,
    updateFilters,
    fetchMetadata,
  } = useMetadata<DataElement>(METADATA_TYPES.DATA_ELEMENT, session, filters);
  
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
        // This would typically come from an API endpoint
        // For now, hardcode some example groups
        setGroupOptions([
          { id: 'group1', name: 'Core Indicators' },
          { id: 'group2', name: 'Demographic Data' },
          { id: 'group3', name: 'Health Services' },
          { id: 'group4', name: 'Survey Data' },
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
        filename: `data_elements_export_${new Date().toISOString().split('T')[0]}`
      }
    );
    
    // Create a downloadable link
    const url = ExportService.createDownloadLink(
      exportContent,
      `data_elements_export_${new Date().toISOString().split('T')[0]}`,
      format
    );
    
    // Create a temporary anchor and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_elements_export_${new Date().toISOString().split('T')[0]}.${format}`;
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
          <h1 className="text-2xl font-semibold text-gray-900">Data Elements</h1>
          
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
          <nav className="flex space-x-8 px-6 pt-4">
            <button
              onClick={() => setActiveTab('table')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'table'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Standard View
            </button>
            <button
              onClick={() => setActiveTab('sqlview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'sqlview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              SQL View Analysis
            </button>
          </nav>
        </div>

        {/* SQL View Data Display (shown only when that tab is active) */}
        {activeTab === 'sqlview' && (
          <div className="bg-white rounded-lg shadow">
            <SqlViewDataDisplay category="data_elements" />
          </div>
        )}
        
        {/* Only show the regular table view when that tab is active */}
        {activeTab === 'table' && (
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
                    basePath="/data-elements"
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