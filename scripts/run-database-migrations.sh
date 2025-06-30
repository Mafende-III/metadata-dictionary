#!/bin/bash

# 🔧 Database Migration Runner
# Applies all necessary schema fixes for the DHIS2 Metadata Dictionary

echo "🚀 Starting Database Schema Migration..."
echo "======================================="

# Set default values (override with environment variables)
DB_HOST=${SUPABASE_DB_HOST:-"localhost"}
DB_USER=${SUPABASE_DB_USER:-"postgres"}
DB_NAME=${SUPABASE_DB_NAME:-"postgres"}
DB_PORT=${SUPABASE_DB_PORT:-"5432"}

echo "📋 Migration Configuration:"
echo "  Host: $DB_HOST"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Port: $DB_PORT"
echo ""

# Function to run SQL file with error handling
run_migration() {
    local file=$1
    local description=$2
    
    echo "🔄 Applying: $description"
    echo "   File: $file"
    
    if [ ! -f "$file" ]; then
        echo "❌ Error: Migration file not found: $file"
        return 1
    fi
    
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$file"; then
        echo "✅ Success: $description"
    else
        echo "❌ Failed: $description"
        echo "   Check the error above and fix before continuing"
        return 1
    fi
    echo ""
}

# Step 1: Create schema migrations table
run_migration "scripts/create-schema-migrations-table.sql" "Schema migrations tracking table"

# Step 2: Apply main schema fix
run_migration "scripts/fix-data-values-api-column.sql" "Data values API column and enhanced features"

# Step 3: Verify the changes
echo "🔍 Verifying Schema Changes..."
echo "================================"

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "
SELECT 'Schema verification:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dictionary_variables' 
  AND column_name IN ('data_values_api', 'action', 'group_id', 'action_timestamp')
ORDER BY column_name;

SELECT 'Migration history:' as status;
SELECT version, description, applied_at 
FROM schema_migrations 
ORDER BY applied_at DESC 
LIMIT 5;
"

echo ""
echo "🎉 Database Migration Complete!"
echo "==============================="
echo ""
echo "Next Steps:"
echo "1. Clear Next.js cache: rm -rf .next"
echo "2. Restart development server: npm run dev"
echo "3. Test dictionary variable creation"
echo "4. Verify clean API URLs are generated"
echo ""
echo "📊 Expected Results:"
echo "  ✅ Variables save without 'data_values_api column not found' errors"
echo "  ✅ Clean API URLs generated (no hardcoded period/orgUnit)"
echo "  ✅ Enhanced export functionality available"
echo "  ✅ Action tracking features enabled"
echo ""

exit 0 