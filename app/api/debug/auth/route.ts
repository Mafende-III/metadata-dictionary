import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/sessionService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking authentication status');
    
    // Try to get session from cookies
    const session = await getSession();
    
    if (session) {
      console.log('✅ Session found:', {
        id: session.id,
        serverUrl: session.serverUrl,
        hasToken: !!session.token,
        expiresAt: session.expiresAt
      });
      
      return NextResponse.json({
        authenticated: true,
        session: {
          id: session.id,
          serverUrl: session.serverUrl,
          hasToken: !!session.token,
          expiresAt: session.expiresAt
        }
      });
    } else {
      console.log('❌ No session found');
      return NextResponse.json({
        authenticated: false,
        error: 'No session found'
      });
    }
  } catch (error) {
    console.error('❌ Debug auth error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'test-headers') {
      const authHeader = request.headers.get('authorization');
      const dhis2UrlHeader = request.headers.get('x-dhis2-base-url');
      
      return NextResponse.json({
        headers: {
          authorization: authHeader ? 'Present' : 'Missing',
          'x-dhis2-base-url': dhis2UrlHeader || 'Missing'
        },
        environment: {
          NEXT_PUBLIC_DHIS2_BASE_URL: process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'Not set'
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}