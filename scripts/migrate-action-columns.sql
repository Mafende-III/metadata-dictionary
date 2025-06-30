-- Migration script to add action tracking columns to dictionary_variables table
-- Run this script to upgrade existing databases

-- Begin transaction for safety
BEGIN;

-- Add new columns for action tracking (if they don't exist)
DO $$ 
BEGIN
  -- Add action column
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
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_action ON dictionary_variables(action);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_group_id ON dictionary_variables(group_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_variables_action_timestamp ON dictionary_variables(action_timestamp);

-- Create a function to automatically set action_timestamp on updates
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

-- Create a view for action analytics
CREATE OR REPLACE VIEW dictionary_action_analytics AS
SELECT 
  d.name as dictionary_name,
  d.instance_name,
  dv.action,
  dv.group_name,
  COUNT(*) as element_count,
  AVG(dv.quality_score) as avg_quality_score,
  MIN(dv.action_timestamp) as first_action,
  MAX(dv.action_timestamp) as last_action
FROM dictionary_variables dv
JOIN metadata_dictionaries d ON dv.dictionary_id = d.id
GROUP BY d.name, d.instance_name, dv.action, dv.group_name
ORDER BY d.name, dv.action, dv.group_name;

COMMIT;

-- Verification queries
SELECT 'Migration completed successfully. New columns added:' as status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dictionary_variables' 
  AND column_name IN ('action', 'group_id', 'group_name', 'action_timestamp', 'action_details')
ORDER BY column_name; 