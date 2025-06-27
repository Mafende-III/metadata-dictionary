-- Check what tables exist in the database
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Also check if the specific table exists with a different name
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_name LIKE '%dhis2%' OR table_name LIKE '%instance%'; 