# Supabase Setup Steps for Enhanced Dictionary Functionality

## 🎯 Required Database Updates

### **Step 1: Apply Schema Updates**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Add Analytics Cache Table
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

-- 2. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_analytics_cache_dictionary_variable ON analytics_cache(dictionary_id, variable_uid);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- 3. Enable RLS
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS Policy
CREATE POLICY IF NOT EXISTS "Allow all operations for now" ON analytics_cache FOR ALL USING (true);

-- 5. Add Unique Constraint to Dictionary Variables (if not exists)
ALTER TABLE dictionary_variables 
ADD CONSTRAINT IF NOT EXISTS dictionary_variables_dictionary_id_variable_uid_key 
UNIQUE (dictionary_id, variable_uid);
```

### **Step 2: Verify Existing Tables**

Check that these tables exist and have the correct structure:

```sql
-- Check dictionary_variables table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dictionary_variables';

-- Should have these columns:
-- - id (uuid)
-- - dictionary_id (uuid)
-- - variable_uid (text)
-- - variable_name (text)
-- - variable_type (text)
-- - quality_score (integer)
-- - processing_time (integer)
-- - status (text)
-- - error_message (text)
-- - metadata_json (jsonb)
-- - analytics_url (text)
-- - api_url (text)
-- - download_url (text)
-- - dhis2_url (text)
-- - export_formats (jsonb)
-- - created_at (timestamp with time zone)
```

### **Step 3: Add Sample Data (Optional)**

Add some test variables to see the functionality:

```sql
-- Insert sample variables for existing dictionaries
INSERT INTO dictionary_variables (
    dictionary_id, 
    variable_uid, 
    variable_name, 
    variable_type, 
    quality_score, 
    status, 
    metadata_json,
    analytics_url,
    api_url,
    export_formats
) VALUES 
(
    (SELECT id FROM metadata_dictionaries LIMIT 1),
    'fbfJHSPpUQD',
    'ANC 1st visit',
    'dataElements',
    95,
    'success',
    '{"description": "Antenatal care 1st visit", "valueType": "INTEGER", "aggregationType": "SUM"}',
    '/api/analytics?dimension=dx:fbfJHSPpUQD&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT',
    '/api/dataElements/fbfJHSPpUQD.json',
    '["json", "xml", "csv", "pdf"]'
),
(
    (SELECT id FROM metadata_dictionaries LIMIT 1),
    's46m5MS0hxu',
    'BCG doses given',
    'dataElements',
    88,
    'success',
    '{"description": "BCG immunization doses administered", "valueType": "INTEGER", "aggregationType": "SUM"}',
    '/api/analytics?dimension=dx:s46m5MS0hxu&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT',
    '/api/dataElements/s46m5MS0hxu.json',
    '["json", "xml", "csv", "pdf"]'
),
(
    (SELECT id FROM metadata_dictionaries LIMIT 1),
    'YtbsuPPo010',
    'Measles doses given',
    'dataElements',
    92,
    'success',
    '{"description": "Measles immunization doses administered", "valueType": "INTEGER", "aggregationType": "SUM"}',
    '/api/analytics?dimension=dx:YtbsuPPo010&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT',
    '/api/dataElements/YtbsuPPo010.json',
    '["json", "xml", "csv", "pdf"]'
)
ON CONFLICT (dictionary_id, variable_uid) DO NOTHING;
```

### **Step 4: Update Dictionary Status**

Make sure you have at least one dictionary with 'active' status:

```sql
-- Update a dictionary to active status with variables count
UPDATE metadata_dictionaries 
SET 
    status = 'active',
    variables_count = (
        SELECT COUNT(*) 
        FROM dictionary_variables 
        WHERE dictionary_id = metadata_dictionaries.id
    ),
    updated_at = NOW()
WHERE id = (SELECT id FROM metadata_dictionaries LIMIT 1);
```

### **Step 5: Verify Everything Works**

Run these verification queries:

```sql
-- 1. Check dictionaries
SELECT id, name, status, variables_count FROM metadata_dictionaries;

-- 2. Check variables
SELECT dictionary_id, variable_uid, variable_name, quality_score, status 
FROM dictionary_variables;

-- 3. Check analytics cache table exists
SELECT COUNT(*) FROM analytics_cache;

-- 4. Test the update function
SELECT update_dictionary_stats((SELECT id FROM metadata_dictionaries LIMIT 1));
```

## 🚨 **CRITICAL REQUIREMENTS:**

### **1. Environment Variables**
Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **2. DHIS2 Authentication**
Ensure you have working DHIS2 credentials for real data:

```env
NEXT_PUBLIC_DHIS2_BASE_URL=https://your-dhis2-instance.org/api
DHIS2_USERNAME=your_username
DHIS2_PASSWORD=your_password
```

### **3. Missing Authentication Route** 
You may need to verify this route exists:

```typescript
// lib/middleware/auth.ts
export async function getAuthenticatedSession(request: NextRequest) {
  // Implementation should return session with:
  // - serverUrl
  // - authHeader (Basic auth header)
  // - username
}
```

## ✅ **Testing Checklist:**

After setup, test these features:

1. **Dictionary Detail Page:**
   - [ ] Navigate to `/dictionaries/[id]` for an active dictionary
   - [ ] See Overview, Variables, and Analytics tabs
   - [ ] Variables tab shows the sample data

2. **Variables Browsing:**
   - [ ] Search works for variable names
   - [ ] Checkboxes for bulk selection work
   - [ ] Quality scores display correctly

3. **Export Functions:**
   - [ ] Individual variable export buttons work
   - [ ] Combined export with selected variables works
   - [ ] Curl commands generate correctly

4. **Analytics Integration:**
   - [ ] Analytics tab loads data
   - [ ] Analytics API calls work (or show mock data)
   - [ ] Data caching functions properly

## 🔧 **Troubleshooting:**

**If variables don't show:**
- Check dictionary status is 'active'
- Verify dictionary_variables table has data
- Check console for API errors

**If exports fail:**
- Verify API routes are accessible
- Check authentication middleware
- Look for CORS issues

**If analytics don't load:**
- Check DHIS2 credentials
- Verify analytics_cache table exists
- Check network connectivity to DHIS2

## 📝 **Next Steps After Setup:**

1. Run the application: `npm run dev`
2. Navigate to an active dictionary
3. Test all functionality step by step
4. Report any issues with specific error messages 