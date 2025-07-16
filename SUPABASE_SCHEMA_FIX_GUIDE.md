# 🔧 Supabase Schema Fix Guide - Complete Resolution

## 🎯 **Critical Issues Being Fixed**

### **1. Missing `data_values_api` Column**
- **Problem**: 100% variable save failures due to missing database column
- **Solution**: Add column with proper indexing and constraints

### **2. Incomplete Action Tracking Schema**  
- **Problem**: Enhanced features expect columns that don't exist
- **Solution**: Complete action tracking implementation

### **3. Font Loading Crashes**
- **Problem**: Next.js/Turbopack font resolution causing 500 errors
- **Solution**: Remove problematic font imports and use system fonts

### **4. URL Generation Issues**
- **Problem**: Hardcoded period/orgUnit parameters not following DHIS2 docs
- **Solution**: Clean, minimal API URLs per DHIS2 documentation

## 🚀 **Complete Fix Implementation**

### **Step 1: Database Schema Updates**

#### **1.1 Create Schema Migrations Table**
```bash
# Apply schema migrations tracking
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres -f scripts/create-schema-migrations-table.sql
```

#### **1.2 Apply Critical Schema Fix**
```bash
# Apply the main fix for data_values_api column and enhanced features
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres -f scripts/fix-data-values-api-column.sql
```

**Expected Output:**
```
NOTICE:  Added data_values_api column to dictionary_variables
NOTICE:  Added action column to dictionary_variables
NOTICE:  Added group_id column to dictionary_variables
NOTICE:  Added group_name column to dictionary_variables
NOTICE:  Added parent_group_id column to dictionary_variables
NOTICE:  Added parent_group_name column to dictionary_variables
NOTICE:  Added action_timestamp column to dictionary_variables
NOTICE:  Added action_details column to dictionary_variables
COMMIT
```

#### **1.3 Verify Schema Updates**
```sql
-- Check that all columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dictionary_variables' 
  AND column_name IN ('data_values_api', 'action', 'group_id', 'action_timestamp')
ORDER BY column_name;
```

**Expected Result:**
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| action | text | YES |
| action_timestamp | timestamp with time zone | YES |
| data_values_api | text | YES |
| group_id | text | YES |

### **Step 2: Application Code Updates (Already Applied)**

#### **2.1 URL Generation Fix** ✅
- ✅ Removed hardcoded `period=THIS_YEAR&orgUnit=USER_ORGUNIT`
- ✅ Clean APIs: `dataValueSets?dataElement=UID` and `analytics?dimension=dx:UID`
- ✅ DHIS2 documentation compliant

#### **2.2 Font Loading Fix** ✅  
- ✅ Removed problematic `Inter` font import
- ✅ Using system fonts via Tailwind CSS
- ✅ No more 500 errors on page load

### **Step 3: Development Environment Reset**

#### **3.1 Clear Next.js Cache**
```bash
# Remove cached files and restart
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

#### **3.2 Restart Supabase (if local)**
```bash
# If using local Supabase
supabase stop
supabase start
```

### **Step 4: Validation & Testing**

#### **4.1 Test Dictionary Variable Creation**
1. Navigate to any dictionary
2. Try to save variables from preview
3. **Before**: 100% failures with "data_values_api column not found"
4. **After**: Variables save successfully with clean API URLs

#### **4.2 Verify Clean API URLs**
Check that generated URLs are clean:
```typescript
// ✅ EXPECTED: Clean URLs
dataElements: "https://instance.com/api/dataValueSets?dataElement=ABC123"
indicators: "https://instance.com/api/analytics?dimension=dx:XYZ789"

// ❌ OLD: Hardcoded parameters  
dataElements: "https://instance.com/api/dataValueSets?dataElement=ABC123&period=THIS_YEAR&orgUnit=USER_ORGUNIT"
```

#### **4.3 Test Font Loading**
1. Reload the application
2. **Before**: 500 errors with font module resolution
3. **After**: Clean page loads with system fonts

## 🔍 **SQL View Instance Error Troubleshooting**

### **Common SQL View Issues & Solutions**

#### **Issue 1: Authentication Failure on Different Instance**
```
❌ Error: "Authentication failed" or "401 Unauthorized"
```

**Solution:**
```typescript
// Check credentials in InstanceService
1. Verify username/password are correct for the specific instance
2. Check if instance URL includes /api suffix
3. Test connection manually: https://instance.com/api/me
```

#### **Issue 2: SQL Views Not Loading (Mock Fallback)**
```
❌ Error: "Using mock SQL views due to API error"
```

**Debugging Steps:**
```bash
# Test the SQL views endpoint directly
curl -u "username:password" "https://instance.com/api/sqlViews.json"

# Check for common issues:
1. Instance URL format (should end with /api)
2. SSL/certificate issues (for HTTPS instances)  
3. Network connectivity
4. DHIS2 version compatibility
```

#### **Issue 3: Instance Connection Switching Errors**
```
❌ Error: "Failed to switch instance context"
```

**Solution:**
```typescript
// Clear instance cache and re-authenticate
1. Clear browser localStorage
2. Re-enter credentials for the new instance
3. Verify the instance base_url format
```

### **Instance Configuration Validation**

#### **Correct Instance URL Formats:**
```typescript
✅ CORRECT:
- "https://play.im.dhis2.org/stable-2-40-8-1/"
- "https://hmis.example.com/api" 
- "http://localhost:8080/api"

❌ INCORRECT:
- "https://play.dhis2.org/40" (missing /api)
- "https://play.im.dhis2.org/stable-2-40-8-1//" (trailing slash)
- "https://play.dhis2.org/40/dhis" (wrong path)
```

#### **Authentication Test Query:**
```sql
-- Test instance connection in database
SELECT id, name, base_url, status, last_sync 
FROM dhis2_instances 
WHERE status = 'connected'
ORDER BY last_sync DESC;
```

## 📊 **Post-Fix Verification Checklist**

### **Database Schema** ✅
- [ ] `data_values_api` column exists
- [ ] Action tracking columns added
- [ ] Indexes created for performance
- [ ] Schema migrations table created

### **Application Functionality** ✅
- [ ] Variables save without errors
- [ ] Clean API URLs generated
- [ ] Fonts load without 500 errors
- [ ] SQL views list loads (not mock)

### **Instance Management** ✅
- [ ] Multiple instances work
- [ ] Authentication persists
- [ ] SQL views load from actual API
- [ ] Export functionality works

## 🚨 **If Issues Persist**

### **1. Check Supabase Connection**
```bash
# Test Supabase connectivity
curl -X GET "https://[project].supabase.co/rest/v1/metadata_dictionaries" \
  -H "Authorization: Bearer [anon-key]" \
  -H "apikey: [anon-key]"
```

### **2. Verify Column Creation**
```sql
-- Double-check the schema
\d dictionary_variables

-- Should show data_values_api column
```

### **3. Reset Development Environment**
```bash
# Nuclear option - complete reset
rm -rf .next node_modules/.cache
npm install
npm run dev
```

### **4. Check Logs for Specific Errors**
```bash
# Watch for specific error patterns
tail -f ~/.npm/_logs/*.log | grep -E "(data_values_api|font|turbopack)"
```

## 🎯 **Expected Results After Fix**

### **Before Fix:**
- ❌ 100% variable save failures
- ❌ 500 errors on page load
- ❌ Hardcoded API parameters
- ❌ SQL views falling back to mock

### **After Fix:**
- ✅ Variables save successfully 
- ✅ Clean page loads
- ✅ Flexible, DHIS2-compliant API URLs
- ✅ Real SQL views data
- ✅ Enhanced export functionality working

## 📞 **Support Information**

If you encounter issues during the fix:
1. **Check migration logs** in the database
2. **Verify Supabase project permissions**
3. **Confirm DHIS2 instance connectivity**
4. **Review browser console** for remaining errors

The system should now function completely with full DHIS2 integration and proper database schema support.

---

**Migration Date**: January 2024  
**Schema Version**: 2024_01_20_fix_data_values_api  
**Status**: Ready for Production 🚀 