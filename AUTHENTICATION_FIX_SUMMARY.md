# Authentication Fix Summary

## Issues Identified

The application was experiencing 401 Unauthorized errors due to inconsistent authentication handling between the frontend and backend. The main issues were:

### 1. **Mixed Authentication Systems**
- Components were using both `useAuthStore` and `useDHIS2Auth` hooks inconsistently
- `SqlViewDataDisplay` was using `useAuthStore` instead of the session-based `useDHIS2Auth`

### 2. **Incomplete Authentication Headers**
- Frontend was sending `sessionId` parameters without the required `Authorization` header
- The proxy API expected both `sessionId` AND `Authorization` header when using the sessionId approach

### 3. **Supabase Session Token Issue**
- Supabase sessions don't store tokens for security reasons (returned empty token: `''`)
- API routes were trying to use DHIS2Client with empty tokens from Supabase sessions

## Solutions Implemented

### 1. **Fixed useMetadata Hook** (`hooks/useMetadata.ts`)
- Added proper Authorization header along with sessionId parameter
- Added x-dhis2-base-url header for DHIS2 server URL
- Now supports all three authentication methods expected by the proxy API

### 2. **Fixed SqlViewDataDisplay Component** (`components/metadata/SqlViewDataDisplay.tsx`)
- Replaced `useAuthStore` with `useDHIS2Auth` for consistent session management
- Updated API calls to include proper authentication headers
- Added authentication state checking with user-friendly error messages

### 3. **Enhanced SqlViewService** (`lib/services/sqlViewService.ts`)
- Added proper Authorization header to all proxy API calls
- Enhanced logging for debugging authentication issues
- Improved error handling with detailed failure information

### 4. **Fixed All Metadata API Routes**
Updated the following routes to handle authentication consistently:
- `app/api/dhis2/data-elements/route.ts`
- `app/api/dhis2/indicators/route.ts`
- `app/api/dhis2/dashboards/route.ts`

Each route now supports three authentication methods:
1. **sessionId parameter + Authorization header** (for Supabase sessions)
2. **Cookie-based sessions** (for localStorage sessions)
3. **Authorization header + x-dhis2-base-url header** (direct auth)

## Authentication Flow

The authentication now works as follows:

1. **User Login**: 
   - Uses `useDHIS2Auth` hook
   - Stores complete session (with token) in localStorage
   - Stores tokenless session in Supabase for cross-device usage

2. **API Calls**:
   - Frontend sends `sessionId` parameter + `Authorization` header + `x-dhis2-base-url` header
   - Backend tries multiple authentication methods in order:
     - Supabase session + Authorization header
     - Cookie session (with token)
     - Direct Authorization header

3. **Error Handling**:
   - Clear error messages indicating required authentication methods
   - Helpful debugging logs with authentication source information

## Testing the Fix

### 1. **Start the Application**
```bash
npm run dev
```

### 2. **Login Process**
1. Navigate to `http://localhost:3000`
2. Enter your DHIS2 credentials:
   - Server URL (e.g., `https://play.dhis2.org/40/api`)
   - Username
   - Password
3. Click "Login"

### 3. **Test Data Elements**
1. After login, navigate to Data Elements page
2. You should see data loading without authentication errors
3. Check browser console for authentication success logs like:
   ```
   ✅ Data Elements authenticated via: cookie-session
   ```

### 4. **Test SQL Views**
1. Navigate to Data Elements page
2. Click on "SQL View Analysis" tab
3. Select a configured SQL view
4. Data should load without 401 errors
5. Check console for logs like:
   ```
   🔍 Making SQL View request to: /api/dhis2/proxy?path=...
   ✅ Authenticated via: supabase-session-with-auth-header
   ```

## Debugging Authentication Issues

If you encounter authentication issues, check the browser console for these log messages:

### Success Messages:
- `✅ Data Elements authenticated via: cookie-session`
- `✅ Authenticated via: supabase-session-with-auth-header`
- `🔐 Using cookie session for https://your-server.com (user: username)`

### Error Messages:
- `❌ No valid authentication found`
- `❌ SQL View request failed: HTTP 401: Unauthorized`
- Look for detailed error objects with status, URL, and headers

### Authentication Methods Tried:
The system tries authentication in this order:
1. Supabase session + Authorization header
2. Cookie session
3. Authorization header + base URL header

## Files Modified

### Frontend Components:
- `hooks/useMetadata.ts` - Fixed authentication headers
- `components/metadata/SqlViewDataDisplay.tsx` - Switched to useDHIS2Auth
- `lib/services/sqlViewService.ts` - Enhanced authentication handling

### Backend API Routes:
- `app/api/dhis2/data-elements/route.ts`
- `app/api/dhis2/indicators/route.ts` 
- `app/api/dhis2/dashboards/route.ts`

All routes now follow the same authentication pattern as the working proxy route.

## Next Steps

1. **Test all functionality** after the fixes
2. **Monitor console logs** for any remaining authentication issues
3. **Verify SQL View functionality** works end-to-end
4. **Test different authentication scenarios** (login/logout/session expiry)

The authentication system is now consistent across all components and should resolve the 401 Unauthorized errors you were experiencing. 