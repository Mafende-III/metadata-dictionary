import { Database } from '@supabase/supabase-js';
import { BaseMetadata, QualityAssessment } from './metadata';

// Database tables
export interface Tables {
  dhis2_sessions: {
    id: string;
    user_id: string;
    server_url: string;
    username: string;
    created_at: string;
    expires_at: string;
    last_used: string;
  };
  
  metadata_cache: {
    id: string;
    dhis2_session_id: string;
    metadata_type: 'DATA_ELEMENT' | 'INDICATOR' | 'DASHBOARD' | 'SQL_VIEW';
    metadata_id: string;
    metadata_json: string; // Stringified JSON
    quality_score: number;
    cached_at: string;
    expires_at: string;
  };
  
  quality_assessments: {
    id: string;
    metadata_id: string;
    metadata_type: 'DATA_ELEMENT' | 'INDICATOR' | 'DASHBOARD' | 'SQL_VIEW';
    has_description: boolean;
    has_code: boolean;
    has_activity_status: boolean;
    recently_updated: boolean;
    quality_score: number;
    assessed_at: string;
  };
  
  metadata_usage: {
    id: string;
    metadata_id: string;
    metadata_type: 'DATA_ELEMENT' | 'INDICATOR' | 'DASHBOARD' | 'SQL_VIEW';
    view_count: number;
    last_viewed: string;
    viewer_id: string;
  };
}

// Cache item
export interface CacheItem<T extends BaseMetadata> {
  id: string;
  metadataType: string;
  metadataId: string;
  metadata: T;
  qualityAssessment: QualityAssessment;
  cachedAt: string;
  expiresAt: string;
}

// Cache result
export interface CacheResult<T extends BaseMetadata> {
  found: boolean;
  expired: boolean;
  item: CacheItem<T> | null;
} 