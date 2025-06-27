-- Add new API URL fields to dictionary_variables table if they don't exist
ALTER TABLE dictionary_variables 
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS download_url TEXT,
ADD COLUMN IF NOT EXISTS dhis2_url TEXT,
ADD COLUMN IF NOT EXISTS export_formats JSONB DEFAULT '["json", "xml", "csv", "pdf"]';

-- Update existing rows to have default export formats
UPDATE dictionary_variables 
SET export_formats = '["json", "xml", "csv", "pdf"]'
WHERE export_formats IS NULL; 