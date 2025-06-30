-- Fix missing data_values_api column and update schema
-- Run this script to resolve the dictionary variable save failures

-- Begin transaction for safety
BEGIN;

-- Add missing data_values_api column to dictionary_variables table
DO $$ 
BEGIN
  -- Add data_values_api column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'data_values_api') THEN
    ALTER TABLE dictionary_variables 
    ADD COLUMN data_values_api TEXT;
    
    RAISE NOTICE 'Added data_values_api column to dictionary_variables';
  ELSE
    RAISE NOTICE 'data_values_api column already exists';
  END IF;

  -- Add other missing enhanced columns if they don't exist
  
  -- Add action column (from migrate-action-columns.sql)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'action') THEN
    ALTER TABLE dictionary_variables 
    ADD COLUMN action TEXT DEFAULT 'imported' 
    CHECK (action IN ('imported', 'created', 'updated', 'deprecated', 'replaced', 'merged'));
    
    RAISE NOTICE 'Added action column to dictionary_variables';
  END IF;

  -- Add group_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'group_id') THEN
    ALTER TABLE dictionary_variables ADD COLUMN group_id TEXT;
    RAISE NOTICE 'Added group_id column to dictionary_variables';
  END IF;

  -- Add group_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'group_name') THEN
    ALTER TABLE dictionary_variables ADD COLUMN group_name TEXT;
    RAISE NOTICE 'Added group_name column to dictionary_variables';
  END IF;

  -- Add parent_group_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'parent_group_id') THEN
    ALTER TABLE dictionary_variables ADD COLUMN parent_group_id TEXT;
    RAISE NOTICE 'Added parent_group_id column to dictionary_variables';
  END IF;

  -- Add parent_group_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'parent_group_name') THEN
    ALTER TABLE dictionary_variables ADD COLUMN parent_group_name TEXT;
    RAISE NOTICE 'Added parent_group_name column to dictionary_variables';
  END IF;

  -- Add action_timestamp column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'action_timestamp') THEN
    ALTER TABLE dictionary_variables 
    ADD COLUMN action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added action_timestamp column to dictionary_variables';
  END IF;

  -- Add action_details column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'dictionary_variables' AND column_name = 'action_details') THEN
    ALTER TABLE dictionary_variables 
    ADD COLUMN action_details JSONB DEFAULT '{}';
    RAISE NOTICE 'Added action_details column to dictionary_variables';
  END IF;

END $$;

-- Update existing records to set default action_timestamp if null
UPDATE dictionary_variables 
SET action_timestamp = created_at 
WHERE action_timestamp IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_data_values_api ON dictionary_variables(data_values_api);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_action ON dictionary_variables(action);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_group_id ON dictionary_variables(group_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_action_timestamp ON dictionary_variables(action_timestamp);

-- Create or replace function to automatically set action_timestamp on updates
CREATE OR REPLACE FUNCTION update_action_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.action_timestamp = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update action_timestamp
DROP TRIGGER IF EXISTS trigger_update_action_timestamp ON dictionary_variables;
CREATE TRIGGER trigger_update_action_timestamp
  BEFORE UPDATE ON dictionary_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_action_timestamp();

-- Create or replace view for enhanced analytics
CREATE OR REPLACE VIEW dictionary_variable_analytics AS
SELECT 
  d.name as dictionary_name,
  d.instance_name,
  dv.variable_type,
  dv.action,
  dv.group_name,
  COUNT(*) as variable_count,
  AVG(dv.quality_score) as avg_quality_score,
  COUNT(*) FILTER (WHERE dv.data_values_api IS NOT NULL) as has_data_api_count,
  COUNT(*) FILTER (WHERE dv.analytics_url IS NOT NULL) as has_analytics_url_count,
  MIN(dv.action_timestamp) as first_action,
  MAX(dv.action_timestamp) as last_action
FROM dictionary_variables dv
JOIN metadata_dictionaries d ON dv.dictionary_id = d.id
GROUP BY d.name, d.instance_name, dv.variable_type, dv.action, dv.group_name
ORDER BY d.name, dv.variable_type, dv.action;

-- Update schema version tracking
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('2024_01_20_fix_data_values_api', 'Added data_values_api column and enhanced action tracking', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification queries
SELECT 'Schema migration completed successfully. Enhanced columns added:' as status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dictionary_variables' 
  AND column_name IN ('data_values_api', 'action', 'group_id', 'group_name', 'action_timestamp', 'action_details')
ORDER BY column_name;

-- Show sample of enhanced structure
SELECT COUNT(*) as total_variables,
       COUNT(data_values_api) as has_data_api,
       COUNT(DISTINCT variable_type) as metadata_types
FROM dictionary_variables; 