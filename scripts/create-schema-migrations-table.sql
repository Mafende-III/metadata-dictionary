-- Create schema migrations tracking table
-- This helps track which database updates have been applied

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64), -- For validation
    success BOOLEAN DEFAULT TRUE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- Insert initial migration records
INSERT INTO schema_migrations (version, description, applied_at) VALUES
('2024_01_01_initial_schema', 'Initial database schema with all tables', NOW()),
('2024_01_10_action_columns', 'Added action tracking columns to dictionary_variables', NOW()),
('2024_01_15_enhanced_export', 'Enhanced export functionality columns', NOW())
ON CONFLICT (version) DO NOTHING;

-- Show current migration status
SELECT version, description, applied_at, success 
FROM schema_migrations 
ORDER BY applied_at; 