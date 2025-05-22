-- Create tables for DHIS2 Metadata Dictionary

-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User sessions and DHIS2 connections
CREATE TABLE IF NOT EXISTS dhis2_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached metadata for performance
CREATE TABLE IF NOT EXISTS metadata_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dhis2_session_id UUID NOT NULL REFERENCES dhis2_sessions(id) ON DELETE CASCADE,
  metadata_type TEXT NOT NULL,
  metadata_id TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  quality_score SMALLINT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(dhis2_session_id, metadata_type, metadata_id)
);

-- Quality assessments
CREATE TABLE IF NOT EXISTS quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata_id TEXT NOT NULL,
  metadata_type TEXT NOT NULL,
  has_description BOOLEAN NOT NULL DEFAULT FALSE,
  has_code BOOLEAN NOT NULL DEFAULT FALSE,
  has_activity_status BOOLEAN NOT NULL DEFAULT FALSE,
  recently_updated BOOLEAN NOT NULL DEFAULT FALSE,
  quality_score SMALLINT NOT NULL,
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metadata_id, metadata_type)
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS metadata_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata_id TEXT NOT NULL,
  metadata_type TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewer_id TEXT NOT NULL,
  UNIQUE(metadata_id, metadata_type, viewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dhis2_sessions_user ON dhis2_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_session ON metadata_cache(dhis2_session_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_type_id ON metadata_cache(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_type_id ON quality_assessments(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_metadata_usage_type_id ON metadata_usage(metadata_type, metadata_id);

-- Function to calculate quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(
  has_description BOOLEAN,
  has_code BOOLEAN,
  has_activity_status BOOLEAN,
  recently_updated BOOLEAN
) RETURNS SMALLINT AS $$
DECLARE
  score SMALLINT := 0;
BEGIN
  IF has_description THEN
    score := score + 1;
  END IF;
  
  IF has_code THEN
    score := score + 1;
  END IF;
  
  IF has_activity_status THEN
    score := score + 1;
  END IF;
  
  IF recently_updated THEN
    score := score + 1;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to cache metadata
CREATE OR REPLACE FUNCTION cache_metadata(
  p_session_id UUID,
  p_type TEXT,
  p_id TEXT,
  p_json JSONB,
  p_quality_score SMALLINT,
  p_ttl_hours INTEGER DEFAULT 24
) RETURNS UUID AS $$
DECLARE
  cache_id UUID;
BEGIN
  INSERT INTO metadata_cache (
    dhis2_session_id,
    metadata_type,
    metadata_id,
    metadata_json,
    quality_score,
    expires_at
  ) VALUES (
    p_session_id,
    p_type,
    p_id,
    p_json,
    p_quality_score,
    NOW() + (p_ttl_hours * INTERVAL '1 hour')
  )
  ON CONFLICT (dhis2_session_id, metadata_type, metadata_id) 
  DO UPDATE SET
    metadata_json = EXCLUDED.metadata_json,
    quality_score = EXCLUDED.quality_score,
    cached_at = NOW(),
    expires_at = NOW() + (p_ttl_hours * INTERVAL '1 hour')
  RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$ LANGUAGE plpgsql; 