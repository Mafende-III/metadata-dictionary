-- Create tables for DHIS2 Metadata Dictionary
-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DHIS2 Instances Table
CREATE TABLE IF NOT EXISTS dhis2_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  version TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sql_views_count INTEGER DEFAULT 0,
  dictionaries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metadata Dictionaries Table
CREATE TABLE IF NOT EXISTS metadata_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instance_id UUID NOT NULL REFERENCES dhis2_instances(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  metadata_type TEXT NOT NULL CHECK (metadata_type IN ('dataElements', 'indicators', 'programIndicators', 'dataElementGroups', 'indicatorGroups')),
  sql_view_id TEXT NOT NULL,
  group_id TEXT,
  processing_method TEXT DEFAULT 'batch' CHECK (processing_method IN ('batch', 'individual')),
  period TEXT,
  version TEXT DEFAULT 'v1.0',
  variables_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'generating', 'error')),
  quality_average NUMERIC(5,2) DEFAULT 0,
  processing_time INTEGER,
  success_rate NUMERIC(5,2) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dictionary Variables Table
CREATE TABLE IF NOT EXISTS dictionary_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id UUID NOT NULL REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
  variable_uid TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  quality_score INTEGER DEFAULT 0,
  processing_time INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  metadata_json JSONB,
  analytics_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS dhis2_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metadata Cache Table
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

-- Quality Assessments Table
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

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS metadata_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata_id TEXT NOT NULL,
  metadata_type TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewer_id TEXT NOT NULL,
  UNIQUE(metadata_id, metadata_type, viewer_id)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_dhis2_instances_status ON dhis2_instances(status);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_instance ON metadata_dictionaries(instance_id);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_status ON metadata_dictionaries(status);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_dictionary ON dictionary_variables(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_dhis2_sessions_user ON dhis2_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_session ON metadata_cache(dhis2_session_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_type_id ON metadata_cache(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_type_id ON quality_assessments(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_metadata_usage_type_id ON metadata_usage(metadata_type, metadata_id);
