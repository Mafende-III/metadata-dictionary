-- Cleanup script for corrupted dictionary data
-- This script removes invalid dictionary entries and orphaned variables

-- 1. Remove dictionary variables that reference non-existent dictionaries
DELETE FROM dictionary_variables 
WHERE dictionary_id NOT IN (
  SELECT id FROM metadata_dictionaries
);

-- 2. Remove dictionaries with invalid UUIDs or malformed data
DELETE FROM metadata_dictionaries 
WHERE id::text LIKE 'dict-%'  -- Remove old format IDs
   OR name IS NULL 
   OR instance_id IS NULL;

-- 3. Remove orphaned dictionary variables (double-check)
DELETE FROM dictionary_variables 
WHERE dictionary_id IS NULL;

-- 4. Reset dictionary stats for any remaining dictionaries
UPDATE metadata_dictionaries 
SET variables_count = (
  SELECT COUNT(*) 
  FROM dictionary_variables 
  WHERE dictionary_id = metadata_dictionaries.id
),
quality_average = COALESCE((
  SELECT AVG(quality_score) 
  FROM dictionary_variables 
  WHERE dictionary_id = metadata_dictionaries.id
), 0),
success_rate = COALESCE((
  SELECT (COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*))
  FROM dictionary_variables 
  WHERE dictionary_id = metadata_dictionaries.id
), 0);

-- 5. Clean up any stuck 'generating' dictionaries with no variables
UPDATE metadata_dictionaries 
SET status = 'error', 
    error_message = 'Dictionary was stuck in generating state with no variables'
WHERE status = 'generating' 
  AND variables_count = 0 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Show summary of cleanup
SELECT 
  'Dictionaries' as table_name,
  COUNT(*) as total_records
FROM metadata_dictionaries
UNION ALL
SELECT 
  'Variables' as table_name,
  COUNT(*) as total_records
FROM dictionary_variables;

-- Show any remaining issues
SELECT 
  d.id,
  d.name,
  d.status,
  d.variables_count,
  COUNT(v.id) as actual_variables
FROM metadata_dictionaries d
LEFT JOIN dictionary_variables v ON d.id = v.dictionary_id
GROUP BY d.id, d.name, d.status, d.variables_count
HAVING d.variables_count != COUNT(v.id); 