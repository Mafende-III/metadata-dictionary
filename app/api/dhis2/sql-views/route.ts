import { NextRequest, NextResponse } from 'next/server';
import { SqlViewService, SqlViewExecutionOptions } from '@/lib/services/sqlViewService';
import { getSession } from '@/lib/services/sessionService';
import { SessionService } from '@/lib/supabase';

async function getAuthenticatedService(request: NextRequest): Promise<SqlViewService> {
  // Check for sessionId parameter first
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (sessionId) {
    try {
      const session = await SessionService.getSession(sessionId);
      if (session) {
        // Check if auth header is provided for the token
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Basic ')) {
          const token = authHeader.replace('Basic ', '');
          return new SqlViewService(session.serverUrl, token, sessionId);
        }
      }
    } catch (error) {
      console.error('Error retrieving session:', error);
    }
  }
  
  // Try to get session from cookies
  try {
    const session = await getSession();
    if (session && session.token && session.serverUrl) {
      return new SqlViewService(session.serverUrl, session.token, session.id);
    }
  } catch (error) {
    console.error('Error getting session from cookies:', error);
  }
  
  // Check for Authorization header with credentials
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    const token = authHeader.replace('Basic ', '');
    // Use environment variable for base URL or require it in headers
    const baseUrl = request.headers.get('x-dhis2-base-url') || 
                   process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 
                   'https://play.dhis2.org/40/api';
    return new SqlViewService(baseUrl, token);
  }
  
  throw new Error('No valid authentication found. Please ensure you are logged in.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sqlViewId, options, variables, name, cacheId } = body;
    
    // Create authenticated service instance
    const service = await getAuthenticatedService(request);

    switch (action) {
      case 'execute':
        const result = variables 
          ? await service.executeQueryView(sqlViewId, variables, options)
          : await service.executeView(sqlViewId, options);
        return NextResponse.json(result);

      case 'refresh':
        await service.refreshMaterializedView(sqlViewId);
        return NextResponse.json({ success: true });

      case 'metadata':
        const metadata = await service.getSqlViewMetadata(sqlViewId);
        return NextResponse.json(metadata);

      case 'extractVariables':
        const vars = service.extractVariables(body.sqlQuery);
        return NextResponse.json({ variables: vars });

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
    const { searchParams } = new URL(request.url);
    const sqlViewId = searchParams.get('id');

    if (!sqlViewId) {
      return NextResponse.json({ error: 'SQL View ID required' }, { status: 400 });
    }

    // Create authenticated service instance
    const service = await getAuthenticatedService(request);
    const metadata = await service.getSqlViewMetadata(sqlViewId);
    
    return NextResponse.json(metadata);
  } catch (error: unknown) {
    console.error('Failed to get SQL view metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve SQL view metadata', details: errorMessage },
      { status: 500 }
    );
  }
} 