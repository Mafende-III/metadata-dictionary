import { NextRequest, NextResponse } from 'next/server';
import { SqlViewService, SqlViewExecutionOptions } from '@/lib/services/sqlViewService';
import { getSession } from '@/lib/services/sessionService';
import { SessionService } from '@/lib/supabase';
import { EnhancedAuthService } from '@/lib/services/enhancedAuthService';

async function getAuthenticatedServiceEnhanced(request: NextRequest): Promise<SqlViewService> {
  console.log('🔐 Getting authenticated service with enhanced auth...');
  
  // Try enhanced authentication first
  const authResult = await EnhancedAuthService.createClientWithFallback(
    undefined, // No primary auth provided
    { 
      useEnvironment: true,
      useHeaders: true 
    }
  );
  
  if (authResult.success && authResult.client && authResult.session) {
    console.log('✅ Enhanced authentication successful');
    return new SqlViewService(
      authResult.session.serverUrl, 
      authResult.session.token, 
      authResult.session.id
    );
  }
  
  console.log('⚠️ Enhanced auth failed, falling back to legacy method...');
  return getAuthenticatedServiceLegacy(request);
}

async function getAuthenticatedServiceLegacy(request: NextRequest): Promise<SqlViewService> {
  console.log('🔐 Using legacy authentication method...');
  
  // Check for sessionId parameter first
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (sessionId) {
    console.log('🔍 Checking session ID:', sessionId);
    try {
      const session = await SessionService.getSession(sessionId);
      if (session) {
        console.log('✅ Session found via sessionId');
        // Check if auth header is provided for the token
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Basic ')) {
          const token = authHeader.replace('Basic ', '');
          return new SqlViewService(session.serverUrl, token, sessionId);
        }
      } else {
        console.log('❌ No session found for sessionId:', sessionId);
      }
    } catch (error) {
      console.error('❌ Error retrieving session by ID:', error);
    }
  }
  
  // Try to get session from cookies
  console.log('🍪 Trying to get session from cookies...');
  try {
    const session = await getSession();
    if (session && session.token && session.serverUrl) {
      console.log('✅ Session found in cookies:', { 
        id: session.id, 
        serverUrl: session.serverUrl,
        hasToken: !!session.token 
      });
      return new SqlViewService(session.serverUrl, session.token, session.id);
    } else {
      console.log('❌ No valid session in cookies:', {
        hasSession: !!session,
        hasToken: session?.token ? true : false,
        hasServerUrl: session?.serverUrl ? true : false
      });
    }
  } catch (error) {
    console.error('❌ Error getting session from cookies:', error);
  }
  
  // Check for Authorization header with credentials
  console.log('🔑 Checking authorization header...');
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    console.log('✅ Authorization header found');
    const token = authHeader.replace('Basic ', '');
    // Use environment variable for base URL or require it in headers
    const baseUrl = request.headers.get('x-dhis2-base-url') || 
                   process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 
                   'https://play.dhis2.org/40/api';
    console.log('🌐 Using base URL:', baseUrl);
    return new SqlViewService(baseUrl, token);
  }
  
  console.error('❌ No valid authentication found');
  throw new Error('No valid authentication found. Please ensure you are logged in.');
}

// Use enhanced auth as the main method
const getAuthenticatedService = getAuthenticatedServiceEnhanced;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sqlViewId, options, variables, name, cacheId } = body;
    
    // Create authenticated service instance
    const service = await getAuthenticatedService(request);

    switch (action) {
      case 'execute':
        console.log(`🚀 Executing SQL view: ${sqlViewId} with options:`, options);
        const result = variables 
          ? await service.executeQueryView(sqlViewId, { ...options, parameters: variables })
          : await service.executeView(sqlViewId, options);
        console.log(`✅ SQL view execution completed: ${result.data.length} rows returned`);
        return NextResponse.json(result);

      case 'executeBatch':
        console.log(`📦 Executing SQL view with batching: ${sqlViewId} with options:`, options);
        const batchResult = await service.executeViewWithBatching(sqlViewId, options);
        console.log(`✅ Batch execution completed: ${batchResult.data.length} rows in ${batchResult.batches} batches`);
        return NextResponse.json(batchResult);

      case 'refresh':
        console.log(`🔄 Refreshing materialized view: ${sqlViewId}`);
        await service.refreshMaterializedView(sqlViewId);
        return NextResponse.json({ success: true });

      case 'metadata':
        console.log(`📋 Fetching metadata for SQL view: ${sqlViewId}`);
        const metadata = await service.getSqlViewMetadata(sqlViewId);
        return NextResponse.json(metadata);

      case 'extractVariables':
        console.log(`🔍 Extracting variables from SQL query`);
        const vars = service.extractVariables(body.sqlQuery);
        return NextResponse.json({ variables: vars });

      case 'test':
        console.log(`🧪 Testing SQL view access: ${sqlViewId}`);
        const service_cast = service as any; // Access to apiService
        const testResult = await service_cast.apiService.testSqlViewAccess(sqlViewId);
        return NextResponse.json(testResult);

      case 'debug':
        console.log(`🐛 Debug SQL view: ${sqlViewId}`);
        try {
          // Get metadata
          const debugMetadata = await service.getSqlViewMetadata(sqlViewId);
          
          // Test execution
          let executionResult = null;
          let executionError = null;
          try {
            executionResult = await service.executeView(sqlViewId, options || {});
          } catch (execError) {
            executionError = execError instanceof Error ? execError.message : String(execError);
          }
          
          return NextResponse.json({
            sqlViewId,
            metadata: debugMetadata,
            execution: executionResult,
            executionError,
            timestamp: new Date().toISOString()
          });
        } catch (debugError) {
          return NextResponse.json({
            sqlViewId,
            debugError: debugError instanceof Error ? debugError.message : String(debugError),
            timestamp: new Date().toISOString()
          });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('SQL View API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET request received for SQL Views API');
    
    const { searchParams } = new URL(request.url);
    const sqlViewId = searchParams.get('id');
    const action = searchParams.get('action') || 'metadata'; // Default to metadata
    const sessionId = searchParams.get('sessionId');

    console.log('📋 GET Parameters:', { sqlViewId, action, sessionId });

    if (!sqlViewId) {
      return NextResponse.json({ error: 'SQL View ID required' }, { status: 400 });
    }

    // Create authenticated service instance
    const service = await getAuthenticatedService(request);

    switch (action) {
      case 'execute':
        console.log(`🚀 GET: Executing SQL view: ${sqlViewId}`);
        const result = await service.executeView(sqlViewId, {});
        console.log(`✅ GET: SQL view execution completed: ${result.data.length} rows returned`);
        return NextResponse.json(result);

      case 'executeBatch':
        console.log(`📦 GET: Executing SQL view with batching: ${sqlViewId}`);
        const batchResult = await service.executeViewWithBatching(sqlViewId, {
          pageSize: 1000,
          maxRows: 10000
        });
        console.log(`✅ GET: Batch execution completed: ${batchResult.data.length} rows in ${batchResult.batches} batches`);
        return NextResponse.json(batchResult);

      case 'debug':
        console.log(`🐛 GET: Debug SQL view: ${sqlViewId}`);
        const page = parseInt(searchParams.get('page') || '1');
        console.log(`📄 GET: Debug page ${page} for SQL view: ${sqlViewId}`);
        
        try {
          const debugMetadata = await service.getSqlViewMetadata(sqlViewId);
          
          let executionResult = null;
          let executionError = null;
          try {
            // Pass page parameter to execution options
            const executionOptions = page > 1 ? { page } : {};
            executionResult = await service.executeView(sqlViewId, executionOptions);
          } catch (execError) {
            executionError = execError instanceof Error ? execError.message : String(execError);
          }
          
          return NextResponse.json({
            sqlViewId,
            metadata: debugMetadata,
            execution: executionResult,
            executionError,
            timestamp: new Date().toISOString(),
            method: 'GET',
            page
          });
        } catch (debugError) {
          return NextResponse.json({
            sqlViewId,
            debugError: debugError instanceof Error ? debugError.message : String(debugError),
            timestamp: new Date().toISOString(),
            method: 'GET',
            page
          });
        }

      case 'metadata':
      default:
        console.log(`📋 GET: Fetching metadata for SQL view: ${sqlViewId}`);
        const metadata = await service.getSqlViewMetadata(sqlViewId);
        return NextResponse.json(metadata);
    }
    
  } catch (error: unknown) {
    console.error('❌ GET: SQL View API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process GET request', details: errorMessage, method: 'GET' },
      { status: 500 }
    );
  }
} 