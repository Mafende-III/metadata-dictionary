import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../dhis2';
import { SessionService } from '../supabase';
import { getSession } from '../services/sessionService';

export interface AuthResult {
  client: DHIS2Client;
  authSource: string;
  serverUrl: string;
  username?: string;
}

export interface AuthError {
  error: string;
  details: string;
  availableAuthMethods: string[];
}

/**
 * Centralized authentication middleware for DHIS2 API routes
 * Handles multiple authentication methods in priority order:
 * 1. Session ID with Authorization header
 * 2. Session from cookies
 * 3. Authorization header with base URL
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult | AuthError> {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  let dhis2Client: DHIS2Client | null = null;
  let authSource = 'none';
  let serverUrl = '';
  let username = '';

  // Method 1: Check for sessionId parameter with Authorization header
  if (sessionId) {
    try {
      const session = await SessionService.getSession(sessionId);
      if (session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Basic ')) {
          const token = authHeader.replace('Basic ', '');
          dhis2Client = new DHIS2Client(session.serverUrl, token);
          authSource = 'supabase-session-with-auth-header';
          serverUrl = session.serverUrl;
          username = session.username;
          console.log(`🔐 Using Supabase session with auth header for ${session.serverUrl}`);
        }
      }
    } catch (error) {
      console.error('Error retrieving session:', error);
    }
  }

  // Method 2: Get session from cookies
  if (!dhis2Client) {
    try {
      const session = await getSession();
      if (session && session.token && session.serverUrl) {
        dhis2Client = DHIS2Client.fromSession(session);
        authSource = 'cookie-session';
        serverUrl = session.serverUrl;
        username = session.username;
        console.log(`🔐 Using cookie session for ${session.serverUrl} (user: ${session.username})`);
      }
    } catch (error) {
      console.error('Error getting session from cookies:', error);
    }
  }

  // Method 3: Get credentials from request headers
  if (!dhis2Client) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
      const token = authHeader.replace('Basic ', '');
      const baseUrl = req.headers.get('x-dhis2-base-url') || 
                     process.env.NEXT_PUBLIC_DHIS2_BASE_URL;
      if (baseUrl) {
        dhis2Client = new DHIS2Client(baseUrl, token);
        authSource = 'auth-header-with-base-url';
        serverUrl = baseUrl;
        console.log(`🔐 Using auth header with provided base URL: ${baseUrl}`);
      }
    }
  }

  // Return error if no valid authentication found
  if (!dhis2Client) {
    console.error('❌ No valid authentication found for request');
    return {
      error: 'Authentication required',
      details: 'No valid DHIS2 credentials found. Please ensure you are logged in.',
      availableAuthMethods: [
        'sessionId parameter with Authorization header',
        'Valid session in cookies',
        'Authorization header with x-dhis2-base-url header'
      ]
    };
  }

  console.log(`✅ Request authenticated via: ${authSource}`);
  
  return {
    client: dhis2Client,
    authSource,
    serverUrl,
    username
  };
}

/**
 * Higher-order function that wraps API route handlers with authentication
 */
export function withAuth<T extends unknown[]>(
  handler: (req: NextRequest, authResult: AuthResult, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateRequest(req);
    
    // Check if authentication failed
    if ('error' in authResult) {
      return NextResponse.json(authResult, { status: 401 });
    }
    
    // Call the original handler with authenticated client
    return handler(req, authResult, ...args);
  };
}

/**
 * Standardized error response format
 */
export function createErrorResponse(message: string, details?: string, status = 500): NextResponse {
  return NextResponse.json({
    error: message,
    details: details || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Standardized success response format
 */
export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}