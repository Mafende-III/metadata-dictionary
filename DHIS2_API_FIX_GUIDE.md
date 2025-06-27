# DHIS2 API Fix Guide

## 🔧 **What Was Fixed**

Based on your guidance, I've updated the DHIS2 API calls to use the correct endpoints:

### **1. Version Detection (`/api/system/info`)**
- ✅ Enhanced system info endpoint with better error handling
- ✅ Added fallback to `/api/me` endpoint if system info fails
- ✅ Improved logging for debugging

### **2. SQL Views (`/api/sqlViews`)**
- ✅ Updated to use correct SQL views endpoint
- ✅ Added comprehensive logging and error handling
- ✅ Better parameter structure for fields and pagination

### **3. URL Normalization**
- ✅ Improved URL handling for different DHIS2 configurations
- ✅ Better support for custom instance setups
- ✅ Enhanced logging for URL construction

### **4. Credentials Handling**
- ✅ Better Basic Auth token generation
- ✅ Improved error messages for authentication failures
- ✅ Enhanced credential validation

## 🧪 **Testing the Fixes**

### **Step 1: Test with the Application**

1. **Restart your development server:**
```bash
# Stop all running servers
pkill -f "next dev"

# Start fresh
npm run dev
```

2. **Test the endpoints:**
   - Go to: http://localhost:3000
   - Navigate to **Instances** page
   - Try adding a new instance with your credentials

### **Step 2: Use the Direct Test Script**

I've created a test script that directly tests the DHIS2 API endpoints:

1. **Edit the test script:**
```bash
# Open the test script
nano test-dhis2-api.js

# Update the DHIS2_CONFIG section with your credentials:
const DHIS2_CONFIG = {
  baseUrl: 'http://online.hisprwanda.org/hmis',
  username: 'your_actual_username',
  password: 'your_actual_password'
};
```

2. **Run the test:**
```bash
node test-dhis2-api.js
```

This will test:
- ✅ `/api/system/info` (version detection)
- ✅ `/api/sqlViews` (SQL views list)
- ✅ `/api/me` (authentication)
- ✅ `/api/dataElements` (basic metadata)

## 🔍 **Expected Results**

### **System Info Test:**
```
✅ System Info Success: {
  status: 200,
  version: "2.40.1",
  instanceName: "HMIS Rwanda",
  serverDate: "2024-06-26T22:49:38.239Z"
}
```

### **SQL Views Test:**
```
✅ SQL Views Success: {
  status: 200,
  total: 15,
  sqlViews: 15
}

📋 Sample SQL Views:
  1. Active Data Elements (ABC123)
  2. Indicator Completeness (DEF456)
  3. Organisation Unit Hierarchy (GHI789)
```

## 🚨 **If Tests Still Fail**

### **Common Issues & Solutions:**

#### **1. URL Path Issues**
If your DHIS2 instance uses a custom path structure:

```javascript
// Update the baseURL in test-dhis2-api.js
baseURL: 'http://online.hisprwanda.org/hmis/api'  // Include /api directly
```

#### **2. Authentication Issues**
```bash
# Test basic connectivity first
curl -I http://online.hisprwanda.org/hmis/api/system/info

# Test with credentials
curl -u username:password http://online.hisprwanda.org/hmis/api/system/info
```

#### **3. CORS or Proxy Issues**
Your instance might be behind a proxy. Try:
```javascript
// In test-dhis2-api.js, add:
headers: {
  'Authorization': `Basic ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'  // Add this
}
```

## 📋 **Application Logs to Check**

When testing in the application, look for these logs:

### **Good Logs (Working):**
```
🔗 Added /api to dhis URL: http://online.hisprwanda.org/hmis/api
🔍 Testing connection with URL: http://online.hisprwanda.org/hmis/api
✅ System info response: { version: "2.40.1", instanceName: "HMIS Rwanda" }
🔍 Fetching SQL views with params: { fields: "id,name,displayName,type,description", pageSize: 100 }
✅ SQL views response: { total: 15, pageSize: 100, page: 1 }
```

### **Bad Logs (Issues):**
```
❌ Connection test failed: Error: Request failed with status code 404
❌ Error fetching SQL views: Error: Request failed with status code 401
```

## 🎯 **Next Steps After Testing**

1. **If tests pass:** Your application should now properly detect version and list SQL views
2. **If version detection works but SQL views don't:** Check if your instance has any SQL views created
3. **If both fail:** Your instance might have a custom configuration - let me know the exact error messages

## 📞 **Report Results**

Please run the tests and share:
1. **Test script output** (full console logs)
2. **Application behavior** (what you see in the UI)
3. **Browser console errors** (if any)
4. **Specific error messages** (exact text)

This will help me provide more targeted fixes if needed! 