import { useState, useCallback, useEffect } from 'react';
import { MetadataFilter } from '../types/metadata';
import { useRouter } from 'next/navigation';

// Default filter state
const defaultFilters: MetadataFilter = {
  search: '',
  type: [],
  group: [],
  qualityScore: [],
  page: 1,
  pageSize: 50,
  sortBy: 'displayName',
  sortDirection: 'asc',
};

// Hook for managing metadata filters
export const useFilters = (initialFilters: Partial<MetadataFilter> = {}) => {
  const router = useRouter();
  const [filters, setFilters] = useState<MetadataFilter>({
    ...defaultFilters,
    ...initialFilters,
  });
  
  // Update URL with filters
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    // Add non-empty filters to URL
    if (filters.search) queryParams.set('search', filters.search);
    if (filters.type?.length) queryParams.set('type', filters.type.join(','));
    if (filters.group?.length) queryParams.set('group', filters.group.join(','));
    if (filters.qualityScore?.length) queryParams.set('quality', filters.qualityScore.join(','));
    if (filters.page && filters.page !== 1) queryParams.set('page', filters.page.toString());
    if (filters.pageSize && filters.pageSize !== defaultFilters.pageSize) queryParams.set('pageSize', filters.pageSize.toString());
    if (filters.sortBy && filters.sortBy !== defaultFilters.sortBy) queryParams.set('sortBy', filters.sortBy);
    if (filters.sortDirection && filters.sortDirection !== defaultFilters.sortDirection) queryParams.set('sortDir', filters.sortDirection);
    
    // Update URL
    const queryString = queryParams.toString();
    const url = window.location.pathname + (queryString ? `?${queryString}` : '');
    
    // Use history API to update URL without navigation
    window.history.replaceState({}, '', url);
  }, [filters, router]);
  
  // Update search filter
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({
      ...prev,
      search,
      page: 1, // Reset to page 1 when search changes
    }));
  }, []);
  
  // Update type filter
  const setType = useCallback((type: string[]) => {
    setFilters(prev => ({
      ...prev,
      type,
      page: 1, // Reset to page 1 when type changes
    }));
  }, []);
  
  // Update group filter
  const setGroup = useCallback((group: string[]) => {
    setFilters(prev => ({
      ...prev,
      group,
      page: 1, // Reset to page 1 when group changes
    }));
  }, []);
  
  // Update quality score filter
  const setQualityScore = useCallback((qualityScore: number[]) => {
    setFilters(prev => ({
      ...prev,
      qualityScore,
      page: 1, // Reset to page 1 when quality score changes
    }));
  }, []);
  
  // Update page
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
  }, []);
  
  // Update page size
  const setPageSize = useCallback((pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      pageSize,
      page: 1, // Reset to page 1 when page size changes
    }));
  }, []);
  
  // Update sorting
  const setSorting = useCallback((sortBy: string, sortDirection: 'asc' | 'desc' = 'asc') => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortDirection,
    }));
  }, []);
  
  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);
  
  // Parse filters from URL
  const parseFiltersFromUrl = useCallback((url: URL) => {
    const newFilters: Partial<MetadataFilter> = {};
    
    // Get search param
    const search = url.searchParams.get('search');
    if (search) newFilters.search = search;
    
    // Get type param
    const type = url.searchParams.get('type');
    if (type) newFilters.type = type.split(',');
    
    // Get group param
    const group = url.searchParams.get('group');
    if (group) newFilters.group = group.split(',');
    
    // Get quality param
    const quality = url.searchParams.get('quality');
    if (quality) newFilters.qualityScore = quality.split(',').map(Number);
    
    // Get page param
    const page = url.searchParams.get('page');
    if (page) newFilters.page = Number(page);
    
    // Get pageSize param
    const pageSize = url.searchParams.get('pageSize');
    if (pageSize) newFilters.pageSize = Number(pageSize);
    
    // Get sortBy param
    const sortBy = url.searchParams.get('sortBy');
    if (sortBy) newFilters.sortBy = sortBy;
    
    // Get sortDir param
    const sortDir = url.searchParams.get('sortDir');
    if (sortDir && (sortDir === 'asc' || sortDir === 'desc')) {
      newFilters.sortDirection = sortDir;
    }
    
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);
  
  return {
    filters,
    setFilters,
    setSearch,
    setType,
    setGroup,
    setQualityScore,
    setPage,
    setPageSize,
    setSorting,
    resetFilters,
    parseFiltersFromUrl,
  };
};