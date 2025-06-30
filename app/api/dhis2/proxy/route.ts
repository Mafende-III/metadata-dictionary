import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/sessionService';
import { SessionService } from '@/lib/supabase';
import { DHIS2Client } from '@/lib/dhis2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let client: DHIS2Client | null = null;
    let authSource = 'none';
    
    // Check for sessionId parameter first (consistent with other API endpoints)
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      try {
        const session = await SessionService.getSession(sessionId);
        if (session) {
          // Session from Supabase doesn't have token, so we need to create client differently
          // Check if auth header is provided for the token
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.replace('Basic ', '');
            client = new DHIS2Client(session.serverUrl, token);
            authSource = 'supabase-session-with-auth-header';
            console.log(`🔐 Using Supabase session with auth header for ${session.serverUrl}`);
            
            // Log if this is an HTTP instance being proxied (this is good!)
            if (session.serverUrl.startsWith('http://')) {
              console.log(`🌐 Proxying HTTP instance: ${session.serverUrl} (bypasses mixed content policy)`);
            }
          }
        }
      } catch (error) {
        console.error('Error retrieving session:', error);
      }
    }
    
    // If no session or no client yet, try to get session from cookies
    if (!client) {
      try {
        const session = await getSession();
        if (session && session.token && session.serverUrl) {
          client = DHIS2Client.fromSession(session);
          authSource = 'cookie-session';
          console.log(`🔐 Using cookie session for ${session.serverUrl} (user: ${session.username})`);
          
          // Log if this is an HTTP instance being proxied
          if (session.serverUrl.startsWith('http://')) {
            console.log(`🌐 Proxying HTTP instance: ${session.serverUrl} (bypasses mixed content policy)`);
          }
        }
      } catch (error) {
        console.error('Error getting session from cookies:', error);
      }
    }
    
    // If still no client, try to get credentials from request headers
    if (!client) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Basic ')) {
        // Get base URL from headers or use saved base URL
        const baseUrl = request.headers.get('x-dhis2-base-url');
        if (baseUrl) {
          client = new DHIS2Client(baseUrl);
          const token = authHeader.replace('Basic ', '');
          client.setToken(token);
          authSource = 'auth-header-with-base-url';
          console.log(`🔐 Using auth header with provided base URL: ${baseUrl}`);
          
          // Log if this is an HTTP instance being proxied
          if (baseUrl.startsWith('http://')) {
            console.log(`🌐 Proxying HTTP instance: ${baseUrl} (bypasses mixed content policy)`);
            console.log(`✅ Server-side proxy successfully handles HTTP instances for local development`);
          }
        }
      }
    }
    
    // Return error if no valid authentication found (don't fall back to defaults)
    if (!client) {
      console.error('❌ No valid authentication found. Available auth methods:');
      console.error('  - sessionId param with Authorization header');
      console.error('  - Valid session in cookies');
      console.error('  - Authorization header with x-dhis2-base-url header');
      
      return NextResponse.json({ 
        error: 'Authentication required', 
        details: 'No valid DHIS2 credentials found. Please log in first.',
        helpForDevelopers: {
          httpInstanceSupport: 'This proxy automatically supports HTTP instances for local development',
          requiredHeaders: [
            'Authorization: Basic <base64-encoded-credentials>',
            'x-dhis2-base-url: <your-dhis2-instance-url>'
          ],
          exampleUsage: {
            url: '/api/dhis2/proxy?path=/system/info',
            headers: {
              'Authorization': 'Basic <token>',
              'x-dhis2-base-url': 'http://localhost:8080/api'
            }
          }
        },
        availableAuthMethods: [
          'sessionId parameter with Authorization header',
          'Valid session in cookies',
          'Authorization header with x-dhis2-base-url header'
        ]
      }, { status: 401 });
    }

    console.log(`✅ Authenticated via: ${authSource}`);
    return await handleRequest(client, request);
  } catch (error: any) {
    console.error('Proxy request failed:', error);
    
    // Enhanced error handling with developer guidance
    let errorResponse = {
      error: 'Proxy request failed',
      details: error.message || 'Unknown error',
      status: error.httpStatusCode || 500
    };

    // Add specific guidance for common issues
    if (error.code === 'ECONNREFUSED') {
      errorResponse = {
        ...errorResponse,
        details: 'Connection refused - DHIS2 instance may be down or unreachable',
        troubleshooting: [
          'Check if DHIS2 instance is running',
          'Verify the base URL is correct',
          'Ensure no firewall is blocking the connection',
          'For local instances, try using IP address instead of localhost'
        ]
      };
    } else if (error.code === 'ENOTFOUND') {
      errorResponse = {
        ...errorResponse,
        details: 'Host not found - check your DHIS2 instance URL',
        troubleshooting: [
          'Verify the hostname/IP address is correct',
          'Check if the instance is accessible from the server',
          'Ensure DNS resolution is working'
        ]
      };
    }

    return NextResponse.json(errorResponse, { 
      status: error.httpStatusCode || 500 
    });
  }
}

async function handleRequest(client: DHIS2Client, request: NextRequest) {
  // Get the path from search params
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
  }

  // Remove 'path' from search params and forward the rest
  const forwardParams = new URLSearchParams(searchParams);
  forwardParams.delete('path');
  
  // Build the full URL with remaining parameters
  const fullPath = forwardParams.toString() ? `${path}?${forwardParams.toString()}` : path;
  
  // Make request through authenticated client
  const response = await (client as any).axiosInstance.get(fullPath);
  
  return NextResponse.json(response.data);
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let client: DHIS2Client | null = null;
    let authSource = 'none';
    
    // Check for sessionId parameter first (consistent with other API endpoints)
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      try {
        const session = await SessionService.getSession(sessionId);
        if (session) {
          // Session from Supabase doesn't have token, so we need to create client differently
          // Check if auth header is provided for the token
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.replace('Basic ', '');
            client = new DHIS2Client(session.serverUrl, token);
            authSource = 'supabase-session-with-auth-header';
            console.log(`🔐 POST: Using Supabase session with auth header for ${session.serverUrl}`);
          }
        }
      } catch (error) {
        console.error('Error retrieving session:', error);
      }
    }
    
    // If no session or no client yet, try to get session from cookies
    if (!client) {
      try {
        const session = await getSession();
        if (session && session.token && session.serverUrl) {
          client = DHIS2Client.fromSession(session);
          authSource = 'cookie-session';
          console.log(`🔐 POST: Using cookie session for ${session.serverUrl} (user: ${session.username})`);
        }
      } catch (error) {
        console.error('Error getting session from cookies:', error);
      }
    }
    
    // If still no client, try to get credentials from request headers
    if (!client) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Basic ')) {
        // Get base URL from headers
        const baseUrl = request.headers.get('x-dhis2-base-url');
        if (baseUrl) {
          client = new DHIS2Client(baseUrl);
          const token = authHeader.replace('Basic ', '');
          client.setToken(token);
          authSource = 'auth-header-with-base-url';
          console.log(`🔐 POST: Using auth header with provided base URL: ${baseUrl}`);
        }
      }
    }
    
    // Return error if no valid authentication found (don't fall back to defaults)
    if (!client) {
      console.error('❌ POST: No valid authentication found');
      
      return NextResponse.json({ 
        error: 'Authentication required', 
        details: 'No valid DHIS2 credentials found. Please log in first.',
        availableAuthMethods: [
          'sessionId parameter with Authorization header',
          'Valid session in cookies',
          'Authorization header with x-dhis2-base-url header'
        ]
      }, { status: 401 });
    }

    console.log(`✅ POST: Authenticated via: ${authSource}`);
    return await handlePostRequest(client, request);
  } catch (error: any) {
    console.error('Proxy POST request failed:', error);
    
    const errorResponse = {
      error: 'Proxy request failed',
      details: error.message || 'Unknown error',
      status: error.httpStatusCode || 500
    };

    return NextResponse.json(errorResponse, { 
      status: error.httpStatusCode || 500 
    });
  }
}

async function handlePostRequest(client: DHIS2Client, request: NextRequest) {
  // Get the path from search params
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
  }

  // Get request body
  const body = await request.json();
  
  // Remove 'path' from search params and forward the rest
  const forwardParams = new URLSearchParams(searchParams);
  forwardParams.delete('path');
  
  // Build the full URL with remaining parameters
  const fullPath = forwardParams.toString() ? `${path}?${forwardParams.toString()}` : path;
  
  // Make request through authenticated client
  const response = await (client as any).axiosInstance.post(fullPath, body);
  
  return NextResponse.json(response.data);
} 