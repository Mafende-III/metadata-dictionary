-- Create tables for DHIS2 Metadata Dictionary

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DHIS2 Instances
CREATE TABLE IF NOT EXISTS dhis2_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_encrypted TEXT NOT NULL, -- Encrypted password
  version VARCHAR(50),
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sql_views_count INTEGER DEFAULT 0,
  dictionaries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(base_url, username)
);

-- Metadata Dictionaries
CREATE TABLE IF NOT EXISTS metadata_dictionaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instance_id UUID REFERENCES dhis2_instances(id) ON DELETE CASCADE,
  instance_name VARCHAR(255), -- Denormalized for easier querying
  metadata_type VARCHAR(50) NOT NULL, -- dataElements, indicators, etc.
  sql_view_id VARCHAR(100),
  group_id VARCHAR(100),
  processing_method VARCHAR(50) DEFAULT 'group', -- 'group' or 'individual'
  period VARCHAR(50), -- Optional period specification
  version VARCHAR(20) DEFAULT '1.0',
  variables_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'active', 'error')),
  quality_average DECIMAL(3,2) DEFAULT 0.0,
  processing_time INTEGER, -- in seconds
  success_rate DECIMAL(5,2) DEFAULT 0.0,
  error_message TEXT,
  data JSONB, -- Store the actual dictionary data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dictionary Variables (stores the actual metadata items)
CREATE TABLE IF NOT EXISTS dictionary_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id UUID NOT NULL REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
  variable_uid TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  quality_score INTEGER DEFAULT 0,
  processing_time INTEGER, -- In milliseconds
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  metadata_json JSONB,
  analytics_url TEXT,
  api_url TEXT,
  download_url TEXT,
  dhis2_url TEXT,
  export_formats JSONB DEFAULT '["json", "xml", "csv", "pdf"]',
  -- Enhanced columns for action tracking and group relationships
  action TEXT DEFAULT 'imported' CHECK (action IN ('imported', 'created', 'updated', 'deprecated', 'replaced', 'merged')),
  group_id TEXT,
  group_name TEXT,
  parent_group_id TEXT,
  parent_group_name TEXT,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_details JSONB DEFAULT '{}', -- Additional action-specific metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dictionary_id, variable_uid)
);

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

-- SQL View Templates table
CREATE TABLE IF NOT EXISTS sql_view_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_sql TEXT NOT NULL,
    metadata_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '[]', -- Array of parameter definitions
    created_by VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SQL View Executions Cache table
CREATE TABLE IF NOT EXISTS sql_view_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sql_view_id VARCHAR(100) NOT NULL,
    instance_id UUID REFERENCES dhis2_instances(id) ON DELETE CASCADE,
    template_id UUID REFERENCES sql_view_templates(id) ON DELETE SET NULL,
    execution_name VARCHAR(255),
    parameters JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    data JSONB NOT NULL, -- The cached result data
    headers JSONB DEFAULT '[]', -- Column headers
    row_count INTEGER DEFAULT 0,
    execution_time INTEGER DEFAULT 0, -- in milliseconds
    executed_by VARCHAR(100),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions table (for credential storage)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    instance_id UUID REFERENCES dhis2_instances(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Queue table
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dictionary_id UUID REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5, -- 1-10, higher is more priority
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Cache table
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dictionary_id UUID NOT NULL REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
    variable_uid VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dictionary_id, variable_uid)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dhis2_instances_status ON dhis2_instances(status);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_instance ON metadata_dictionaries(instance_id);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_status ON metadata_dictionaries(status);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_dictionary ON dictionary_variables(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_dhis2_sessions_user ON dhis2_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_session ON metadata_cache(dhis2_session_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_type_id ON metadata_cache(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_type_id ON quality_assessments(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_metadata_usage_type_id ON metadata_usage(metadata_type, metadata_id);
CREATE INDEX IF NOT EXISTS idx_sql_view_executions_sql_view_id ON sql_view_executions(sql_view_id);
CREATE INDEX IF NOT EXISTS idx_sql_view_executions_instance_id ON sql_view_executions(instance_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_dictionary_variable ON analytics_cache(dictionary_id, variable_uid);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- RLS (Row Level Security) policies
ALTER TABLE dhis2_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_dictionaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sql_view_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sql_view_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust based on your auth system)
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON dhis2_instances FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON metadata_dictionaries FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON sql_view_templates FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON sql_view_executions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON user_sessions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON processing_queue FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON analytics_cache FOR ALL USING (true);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dhis2_instances_updated_at BEFORE UPDATE ON dhis2_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metadata_dictionaries_updated_at BEFORE UPDATE ON metadata_dictionaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sql_view_templates_updated_at BEFORE UPDATE ON sql_view_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO dhis2_instances (id, name, base_url, username, password_encrypted, version, status, sql_views_count, dictionaries_count) 
VALUES 
    ('a4b7da3f-c1b6-4953-b6e7-42435feb80e6'::uuid, 'HMIS Current', 'https://online.hisprwanda.org/hmis/api', 'bmafende', encode(digest('district', 'sha256'), 'base64'), '2.41.3', 'connected', 14, 3),
    ('67950ada-2fba-4e6f-aa94-a44f33aa8d20'::uuid, 'Demo DHIS2', 'https://play.im.dhis2.org/stable-2-40-8-1/', 'admin', encode(digest('district', 'sha256'), 'base64'), '2.40.1', 'connected', 12, 2)
ON CONFLICT (base_url, username) DO NOTHING;

-- Insert sample dictionaries
INSERT INTO metadata_dictionaries (id, name, description, instance_id, instance_name, metadata_type, status, variables_count, quality_average, success_rate) 
VALUES 
    ('5d67cdc7-b6e3-4f61-afde-170d3c44505b'::uuid, 'HMIS Test Dictionary', 'Test dictionary for development', 'a4b7da3f-c1b6-4953-b6e7-42435feb80e6'::uuid, 'HMIS Current', 'dataElements', 'generating', 0, 0.0, 0.0),
    ('f8e9d5c3-7a2b-4f1e-9c8d-6e5f4a3b2c1d'::uuid, 'Demo Data Elements', 'Demo dictionary for data elements', '67950ada-2fba-4e6f-aa94-a44f33aa8d20'::uuid, 'Demo DHIS2', 'dataElements', 'active', 150, 87.5, 95.2)
ON CONFLICT (id) DO NOTHING;

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

-- Function to update instance statistics
CREATE OR REPLACE FUNCTION update_instance_stats(p_instance_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE dhis2_instances 
  SET 
    dictionaries_count = (
      SELECT COUNT(*) 
      FROM metadata_dictionaries 
      WHERE instance_id = p_instance_id
    ),
    updated_at = NOW()
  WHERE id = p_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update dictionary statistics
CREATE OR REPLACE FUNCTION update_dictionary_stats(p_dictionary_id UUID)
RETURNS VOID AS $$
DECLARE
  var_count INTEGER;
  avg_quality NUMERIC;
  success_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    AVG(quality_score),
    COUNT(*) FILTER (WHERE status = 'success'),
    COUNT(*)
  INTO var_count, avg_quality, success_count, total_count
  FROM dictionary_variables 
  WHERE dictionary_id = p_dictionary_id;
  
  UPDATE metadata_dictionaries 
  SET 
    variables_count = var_count,
    quality_average = COALESCE(avg_quality, 0),
    success_rate = CASE 
      WHEN total_count > 0 THEN (success_count::NUMERIC / total_count::NUMERIC) * 100 
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE id = p_dictionary_id;
END;
$$ LANGUAGE plpgsql; 