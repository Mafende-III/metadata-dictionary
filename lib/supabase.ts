import { createClient } from '@supabase/supabase-js';
import { CacheItem, CacheResult } from '../types/supabase';
import { BaseMetadata, QualityAssessment } from '../types/metadata';
import { Session } from '../types/auth';
import config from './config';

// Initialize Supabase client with null checks
let supabase: any = null;

function initializeSupabase() {
  if (config.supabase.url && config.supabase.anonKey) {
    try {
      supabase = createClient(config.supabase.url, config.supabase.anonKey);
      console.log('✅ Supabase initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      supabase = null;
    }
  } else {
    console.warn('⚠️ Supabase not initialized - missing environment variables');
    supabase = null;
  }
}

// Initialize on import
initializeSupabase();

// Helper function to check if Supabase is available
function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export { supabase };

// Cache service
export class CacheService {
  // Store metadata in cache
  static async cacheMetadata<T extends BaseMetadata>(
    sessionId: string,
    metadataType: string,
    metadata: T,
    qualityAssessment: QualityAssessment,
    ttlHours = 24
  ): Promise<string> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping cache metadata');
      return `local_cache_${Date.now()}`;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('metadata_cache')
      .upsert({
        dhis2_session_id: sessionId,
        metadata_type: metadataType,
        metadata_id: metadata.id,
        metadata_json: JSON.stringify(metadata),
        quality_score: qualityAssessment.qualityScore,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select('id');
      
    if (error) throw new Error(`Failed to cache metadata: ${error.message}`);
    return data?.[0]?.id;
  }
  
  // Get metadata from cache
  static async getCachedMetadata<T extends BaseMetadata>(
    sessionId: string,
    metadataType: string,
    metadataId: string
  ): Promise<CacheResult<T>> {
    if (!isSupabaseAvailable()) {
      return { found: false, expired: false, item: null };
    }

    const { data, error } = await supabase
      .from('metadata_cache')
      .select('*')
      .eq('dhis2_session_id', sessionId)
      .eq('metadata_type', metadataType)
      .eq('metadata_id', metadataId)
      .single();
      
    if (error || !data) {
      return { found: false, expired: false, item: null };
    }
    
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const expired = now > expiresAt;
    
    const metadata = JSON.parse(data.metadata_json) as T;
    
    // Get quality assessment
    const { data: qualityData } = await supabase
      .from('quality_assessments')
      .select('*')
      .eq('metadata_id', metadataId)
      .eq('metadata_type', metadataType)
      .single();
      
    const qualityAssessment: QualityAssessment = qualityData ? {
      id: qualityData.id,
      metadataId: qualityData.metadata_id,
      metadataType: qualityData.metadata_type,
      hasDescription: qualityData.has_description,
      hasCode: qualityData.has_code,
      hasActivityStatus: qualityData.has_activity_status,
      recentlyUpdated: qualityData.recently_updated,
      qualityScore: qualityData.quality_score,
      assessedAt: qualityData.assessed_at
    } : {
      id: '',
      metadataId: metadataId,
      metadataType: metadataType,
      hasDescription: false,
      hasCode: false,
      hasActivityStatus: false,
      recentlyUpdated: false,
      qualityScore: 0,
      assessedAt: new Date().toISOString()
    };
    
    return {
      found: true,
      expired,
      item: {
        id: data.id,
        metadataType: data.metadata_type,
        metadataId: data.metadata_id,
        metadata,
        qualityAssessment,
        cachedAt: data.cached_at,
        expiresAt: data.expires_at
      }
    };
  }
  
  // Invalidate cache
  static async invalidateCache(sessionId: string, pattern?: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping cache invalidation');
      return;
    }

    let query = supabase
      .from('metadata_cache')
      .delete();
      
    if (sessionId) {
      query = query.eq('dhis2_session_id', sessionId);
    }
    
    if (pattern) {
      query = query.like('metadata_id', `%${pattern}%`);
    }
    
    await query;
  }
  
  // Track metadata usage
  static async trackUsage(
    sessionId: string,
    userId: string,
    metadataType: string,
    metadataId: string
  ): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping usage tracking');
      return;
    }

    const now = new Date().toISOString();
    
    // First check if exists
    const { data } = await supabase
      .from('metadata_usage')
      .select('id, view_count')
      .eq('metadata_id', metadataId)
      .eq('metadata_type', metadataType)
      .single();
      
    if (data) {
      // Update existing record
      await supabase
        .from('metadata_usage')
        .update({ 
          view_count: data.view_count + 1,
          last_viewed: now,
          viewer_id: userId
        })
        .eq('id', data.id);
    } else {
      // Insert new record
      await supabase
        .from('metadata_usage')
        .insert({
          metadata_id: metadataId,
          metadata_type: metadataType,
          view_count: 1,
          last_viewed: now,
          viewer_id: userId
        });
    }
  }
}

// Session management
export class SessionService {
  // Store session
  static async storeSession(session: Session): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping session storage');
      return;
    }

    const { error } = await supabase
      .from('dhis2_sessions')
      .upsert({
        id: session.id,
        user_id: session.userId,
        server_url: session.serverUrl,
        username: session.username,
        created_at: new Date().toISOString(),
        expires_at: session.expiresAt,
        last_used: session.lastUsed
      });
      
    if (error) throw new Error(`Failed to store session: ${error.message}`);
  }
  
  // Get session
  static async getSession(sessionId: string): Promise<Session | null> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, cannot retrieve session');
      return null;
    }

    const { data, error } = await supabase
      .from('dhis2_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (error || !data) return null;
    
    return {
      id: data.id,
      userId: data.user_id,
      serverUrl: data.server_url,
      username: data.username,
      token: '', // Token is not stored in database for security
      expiresAt: data.expires_at,
      lastUsed: data.last_used
    };
  }
  
  // Update session last used
  static async updateSessionUsage(sessionId: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping session usage update');
      return;
    }

    await supabase
      .from('dhis2_sessions')
      .update({ last_used: new Date().toISOString() })
      .eq('id', sessionId);
  }
  
  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, skipping session deletion');
      return;
    }

    await supabase
      .from('dhis2_sessions')
      .delete()
      .eq('id', sessionId);
  }
} 