import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BaseMetadata, MetadataFilter, MetadataWithQuality, QualityAssessment } from '../types/metadata';
import { Session } from '../types/auth';
import { API_ROUTES } from '../lib/constants';

// Metadata fetch state
interface MetadataState<T extends BaseMetadata> {
  data: MetadataWithQuality<T>[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

// Default metadata state
const defaultMetadataState = <T extends BaseMetadata>(): MetadataState<T> => ({
  data: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    pageCount: 0,
  },
});

// Hook for fetching metadata
export const useMetadata = <T extends BaseMetadata>(
  metadataType: string,
  session: Session | null,
  initialFilters: MetadataFilter = {}
) => {
  const [state, setState] = useState<MetadataState<T>>(defaultMetadataState<T>());
  const [filters, setFilters] = useState<MetadataFilter>(initialFilters);
  
  // Get API endpoint based on metadata type
  const getEndpoint = useCallback(() => {
    switch (metadataType) {
      case 'DATA_ELEMENT':
        return API_ROUTES.DHIS2.DATA_ELEMENTS;
      case 'INDICATOR':
        return API_ROUTES.DHIS2.INDICATORS;
      case 'DASHBOARD':
        return API_ROUTES.DHIS2.DASHBOARDS;
      case 'SQL_VIEW':
        return API_ROUTES.DHIS2.SQL_VIEWS;
      default:
        throw new Error(`Unsupported metadata type: ${metadataType}`);
    }
  }, [metadataType]);
  
  // Fetch metadata list
  const fetchMetadata = useCallback(async () => {
    if (!session) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const endpoint = getEndpoint();
      const params = {
        ...filters,
        sessionId: session.id,
      };
      
      // Set up proper authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if session has token
      if (session.token) {
        headers['Authorization'] = `Basic ${session.token}`;
      }
      
      // Add DHIS2 base URL header
      if (session.serverUrl) {
        headers['x-dhis2-base-url'] = session.serverUrl;
      }
      
      const response = await axios.get(endpoint, { 
        params,
        headers
      });
      
      // Process response
      const { items, pager } = response.data;
      
      setState({
        data: items,
        isLoading: false,
        error: null,
        pagination: {
          page: pager.page,
          pageSize: pager.pageSize,
          total: pager.total,
          pageCount: pager.pageCount,
        },
      });
    } catch (error: any) {
      console.error('Error fetching metadata:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch metadata',
      }));
    }
  }, [session, filters, getEndpoint]);
  
  // Fetch metadata by ID
  const fetchMetadataById = useCallback(async (id: string): Promise<MetadataWithQuality<T> | null> => {
    if (!session) {
      return null;
    }
    
    try {
      const endpoint = `${getEndpoint()}/${id}`;
      const params = { sessionId: session.id };
      
      // Set up proper authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if session has token
      if (session.token) {
        headers['Authorization'] = `Basic ${session.token}`;
      }
      
      // Add DHIS2 base URL header
      if (session.serverUrl) {
        headers['x-dhis2-base-url'] = session.serverUrl;
      }
      
      const response = await axios.get(endpoint, { 
        params,
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching metadata by ID:', error);
      return null;
    }
  }, [session, getEndpoint]);
  
  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MetadataFilter>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 if filters change (except when changing page)
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);
  
  // Fetch metadata when filters or session changes
  useEffect(() => {
    if (session) {
      fetchMetadata();
    }
  }, [session, filters, fetchMetadata]);
  
  // Get quality assessment for metadata
  const getQualityAssessment = useCallback(async (metadata: T): Promise<QualityAssessment> => {
    if (!session) {
      throw new Error('Authentication required');
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if session has token
      if (session.token) {
        headers['Authorization'] = `Basic ${session.token}`;
      }
      
      const response = await axios.post(API_ROUTES.METADATA.QUALITY, {
        metadata,
        metadataType,
        sessionId: session.id,
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Error assessing metadata quality:', error);
      
      // Return default quality assessment
      return {
        id: `default-${metadata.id}`,
        metadataId: metadata.id,
        metadataType: metadataType as any,
        hasDescription: false,
        hasCode: false,
        hasActivityStatus: false,
        recentlyUpdated: false,
        qualityScore: 0,
        assessedAt: new Date().toISOString(),
      };
    }
  }, [session, metadataType]);
  
  return {
    metadata: state.data,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    filters,
    updateFilters,
    fetchMetadata,
    fetchMetadataById,
    getQualityAssessment,
  };
}; 