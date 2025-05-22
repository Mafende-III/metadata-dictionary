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

export default function DataElementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useDHIS2Auth();
  const [groupOptions, setGroupOptions] = useState<Array<{ id: string; name: string }>>([]);
  
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
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Data Elements</h1>
        
        <div className="flex space-x-2">
          <ExportButton
            onExport={handleExport}
            disabled={isLoading || metadata.length === 0}
          />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row md:space-x-6">
        {/* Filters sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 mb-6 md:mb-0">
          <MetadataFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={resetFilters}
            groupOptions={groupOptions}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          {error ? (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
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
  );
} 