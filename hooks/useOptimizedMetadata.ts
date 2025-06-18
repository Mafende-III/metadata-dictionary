import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { MetadataFilter, DataElement, Indicator, Dashboard } from '@/types/metadata';
import { QualityAssessmentService } from '@/lib/quality-assessment';

// API functions with optimized caching
const fetchDataElements = async (filters: MetadataFilter) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDirection) params.set('sortDirection', filters.sortDirection);

  const response = await fetch(`/api/dhis2/data-elements?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data elements: ${response.statusText}`);
  }
  return response.json();
};

const fetchIndicators = async (filters: MetadataFilter) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDirection) params.set('sortDirection', filters.sortDirection);

  const response = await fetch(`/api/dhis2/indicators?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch indicators: ${response.statusText}`);
  }
  return response.json();
};

const fetchDashboards = async (filters: MetadataFilter) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());

  const response = await fetch(`/api/dhis2/dashboards?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboards: ${response.statusText}`);
  }
  return response.json();
};

// Query key factories for consistent caching
export const metadataKeys = {
  all: ['metadata'] as const,
  dataElements: () => [...metadataKeys.all, 'dataElements'] as const,
  dataElementsList: (filters: MetadataFilter) => [...metadataKeys.dataElements(), 'list', filters] as const,
  dataElement: (id: string) => [...metadataKeys.dataElements(), 'detail', id] as const,
  indicators: () => [...metadataKeys.all, 'indicators'] as const,
  indicatorsList: (filters: MetadataFilter) => [...metadataKeys.indicators(), 'list', filters] as const,
  indicator: (id: string) => [...metadataKeys.indicators(), 'detail', id] as const,
  dashboards: () => [...metadataKeys.all, 'dashboards'] as const,
  dashboardsList: (filters: MetadataFilter) => [...metadataKeys.dashboards(), 'list', filters] as const,
  dashboard: (id: string) => [...metadataKeys.dashboards(), 'detail', id] as const,
};

// Optimized data elements hook with caching and background refetch
export const useDataElements = (filters: MetadataFilter) => {
  const queryKey = useMemo(() => metadataKeys.dataElementsList(filters), [filters]);
  
  return useQuery({
    queryKey,
    queryFn: () => fetchDataElements(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    // Enable background refetch when filters change
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Prefetch next page
    placeholderData: (previousData) => previousData,
  });
};

// Optimized indicators hook
export const useIndicators = (filters: MetadataFilter) => {
  const queryKey = useMemo(() => metadataKeys.indicatorsList(filters), [filters]);
  
  return useQuery({
    queryKey,
    queryFn: () => fetchIndicators(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

// Optimized dashboards hook
export const useDashboards = (filters: MetadataFilter) => {
  const queryKey = useMemo(() => metadataKeys.dashboardsList(filters), [filters]);
  
  return useQuery({
    queryKey,
    queryFn: () => fetchDashboards(filters),
    staleTime: 10 * 60 * 1000, // Dashboards change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

// Individual metadata item hooks with optimistic updates
export const useDataElement = (id: string) => {
  return useQuery({
    queryKey: metadataKeys.dataElement(id),
    queryFn: async () => {
      const response = await fetch(`/api/dhis2/data-elements?id=${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data element: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // Individual items are more stable
    gcTime: 30 * 60 * 1000,
    enabled: !!id, // Only run if ID is provided
  });
};

export const useIndicator = (id: string) => {
  return useQuery({
    queryKey: metadataKeys.indicator(id),
    queryFn: async () => {
      const response = await fetch(`/api/dhis2/indicators?id=${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch indicator: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
};

// Prefetch functions for performance optimization
export const usePrefetchMetadata = () => {
  const queryClient = useQueryClient();

  const prefetchDataElements = useCallback((filters: MetadataFilter) => {
    return queryClient.prefetchQuery({
      queryKey: metadataKeys.dataElementsList(filters),
      queryFn: () => fetchDataElements(filters),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchNextPage = useCallback((currentFilters: MetadataFilter) => {
    const nextPageFilters = { ...currentFilters, page: (currentFilters.page || 1) + 1 };
    return prefetchDataElements(nextPageFilters);
  }, [prefetchDataElements]);

  return {
    prefetchDataElements,
    prefetchNextPage,
  };
};

// Quality assessment with memoization
export const useMetadataQuality = (metadata: any[], metadataType: 'DATA_ELEMENT' | 'INDICATOR' | 'DASHBOARD') => {
  return useMemo(() => {
    if (!metadata || metadata.length === 0) return [];
    
    return metadata.map(item => ({
      ...item,
      quality: QualityAssessmentService.assessMetadata(item, metadataType)
    }));
  }, [metadata, metadataType]);
};

// Bulk operations with optimistic updates
export const useMetadataMutations = () => {
  const queryClient = useQueryClient();

  const invalidateMetadata = useCallback((type: 'dataElements' | 'indicators' | 'dashboards') => {
    queryClient.invalidateQueries({ queryKey: metadataKeys[type]() });
  }, [queryClient]);

  const updateMetadataCache = useCallback((type: string, id: string, newData: any) => {
    queryClient.setQueryData(metadataKeys.dataElement(id), newData);
  }, [queryClient]);

  return {
    invalidateMetadata,
    updateMetadataCache,
  };
};