-- Database Setup Script for DHIS2 Metadata Dictionary
-- Run this to initialize your Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DHIS2 Instances table
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

-- Metadata Dictionaries table
CREATE TABLE IF NOT EXISTS metadata_dictionaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instance_id UUID REFERENCES dhis2_instances(id) ON DELETE CASCADE,
    instance_name VARCHAR(255), -- Denormalized for easier queries
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dhis2_instances_status ON dhis2_instances(status);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_status ON metadata_dictionaries(status);
CREATE INDEX IF NOT EXISTS idx_metadata_dictionaries_instance_id ON metadata_dictionaries(instance_id);

-- RLS (Row Level Security) policies - Allow all for development
ALTER TABLE dhis2_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_dictionaries ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust based on your auth system)
DROP POLICY IF EXISTS "Allow all operations for now" ON dhis2_instances;
DROP POLICY IF EXISTS "Allow all operations for now" ON metadata_dictionaries;

CREATE POLICY "Allow all operations for now" ON dhis2_instances FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON metadata_dictionaries FOR ALL USING (true);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dhis2_instances_updated_at ON dhis2_instances;
DROP TRIGGER IF EXISTS update_metadata_dictionaries_updated_at ON metadata_dictionaries;

CREATE TRIGGER update_dhis2_instances_updated_at BEFORE UPDATE ON dhis2_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metadata_dictionaries_updated_at BEFORE UPDATE ON metadata_dictionaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO dhis2_instances (id, name, base_url, username, password_encrypted, version, status, sql_views_count, dictionaries_count) 
VALUES 
    ('a4b7da3f-c1b6-4953-b6e7-42435feb80e6'::uuid, 'HMIS Current', 'https://online.hisprwanda.org/hmis/api', 'bmafende', encode(digest('district', 'sha256'), 'base64'), '2.41.3', 'connected', 14, 3),
    ('67950ada-2fba-4e6f-aa94-a44f33aa8d20'::uuid, 'Demo DHIS2', 'https://play.dhis2.org/40/api', 'admin', encode(digest('district', 'sha256'), 'base64'), '2.40.1', 'connected', 12, 2)
ON CONFLICT (base_url, username) DO UPDATE SET
    name = EXCLUDED.name,
    password_encrypted = EXCLUDED.password_encrypted,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    sql_views_count = EXCLUDED.sql_views_count,
    dictionaries_count = EXCLUDED.dictionaries_count;

-- Insert sample dictionaries
INSERT INTO metadata_dictionaries (id, name, description, instance_id, instance_name, metadata_type, status, variables_count, quality_average, success_rate) 
VALUES 
    ('5d67cdc7-b6e3-4f61-afde-170d3c44505b'::uuid, 'HMIS Test Dictionary', 'Test dictionary for development', 'a4b7da3f-c1b6-4953-b6e7-42435feb80e6'::uuid, 'HMIS Current', 'dataElements', 'generating', 0, 0.0, 0.0),
    ('f8e9d5c3-7a2b-4f1e-9c8d-6e5f4a3b2c1d'::uuid, 'Demo Data Elements', 'Demo dictionary for data elements', '67950ada-2fba-4e6f-aa94-a44f33aa8d20'::uuid, 'Demo DHIS2', 'dataElements', 'active', 150, 87.5, 95.2)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    variables_count = EXCLUDED.variables_count,
    quality_average = EXCLUDED.quality_average,
    success_rate = EXCLUDED.success_rate;

-- Verify the setup
SELECT 'Database setup completed successfully!' as status;
SELECT 'Instances count: ' || COUNT(*) as instances FROM dhis2_instances;
SELECT 'Dictionaries count: ' || COUNT(*) as dictionaries FROM metadata_dictionaries; 