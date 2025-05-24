import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/sessionService';
import { SessionService } from '@/lib/supabase';
import { DHIS2Client } from '@/lib/dhis2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let client: DHIS2Client | null = null;
    
    // Check for sessionId parameter first (consistent with other API endpoints)
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      try {
        const session = await SessionService.getSession(sessionId);
        if (session) {
          // Session from Supabase doesn't have token, so we need to create client differently
          // For now, we'll use environment defaults or require auth header
          const baseUrl = session.serverUrl || process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
          client = new DHIS2Client(baseUrl);
          
          // Check if auth header is provided for the token
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.replace('Basic ', '');
            client.setToken(token);
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
        if (session && session.token) {
          client = DHIS2Client.fromSession(session);
        }
      } catch (error) {
        console.error('Error getting session from cookies:', error);
      }
    }
    
    // If still no client, try to get credentials from request headers
    if (!client) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Basic ')) {
        // Extract base URL from environment or use default
        const baseUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
        
        // Create client with auth header
        client = new DHIS2Client(baseUrl);
        const token = authHeader.replace('Basic ', '');
        client.setToken(token);
      }
    }
    
    if (!client) {
      // Fallback to environment credentials for development/demo
      const defaultBaseUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
      const defaultUsername = process.env.DHIS2_DEFAULT_USERNAME || 'admin';
      const defaultPassword = process.env.DHIS2_DEFAULT_PASSWORD || 'district';
      
      if (defaultUsername && defaultPassword) {
        client = new DHIS2Client(defaultBaseUrl);
        const defaultToken = Buffer.from(`${defaultUsername}:${defaultPassword}`).toString('base64');
        client.setToken(defaultToken);
        
        console.warn('Using default DHIS2 credentials - this should only be used for development/demo');
      } else {
        return NextResponse.json({ error: 'Not authenticated - no valid session, authorization header, or default credentials found' }, { status: 401 });
      }
    }

    return await handleRequest(client, request);
  } catch (error: any) {
    console.error('Proxy request failed:', error);
    
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
    
    // Check for sessionId parameter first (consistent with other API endpoints)
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      try {
        const session = await SessionService.getSession(sessionId);
        if (session) {
          // Session from Supabase doesn't have token, so we need to create client differently
          // For now, we'll use environment defaults or require auth header
          const baseUrl = session.serverUrl || process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
          client = new DHIS2Client(baseUrl);
          
          // Check if auth header is provided for the token
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.replace('Basic ', '');
            client.setToken(token);
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
        if (session && session.token) {
          client = DHIS2Client.fromSession(session);
        }
      } catch (error) {
        console.error('Error getting session from cookies:', error);
      }
    }
    
    // If still no client, try to get credentials from request headers
    if (!client) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Basic ')) {
        // Extract base URL from environment or use default
        const baseUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
        
        // Create client with auth header
        client = new DHIS2Client(baseUrl);
        const token = authHeader.replace('Basic ', '');
        client.setToken(token);
      }
    }
    
    if (!client) {
      // Fallback to environment credentials for development/demo
      const defaultBaseUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
      const defaultUsername = process.env.DHIS2_DEFAULT_USERNAME || 'admin';
      const defaultPassword = process.env.DHIS2_DEFAULT_PASSWORD || 'district';
      
      if (defaultUsername && defaultPassword) {
        client = new DHIS2Client(defaultBaseUrl);
        const defaultToken = Buffer.from(`${defaultUsername}:${defaultPassword}`).toString('base64');
        client.setToken(defaultToken);
        
        console.warn('Using default DHIS2 credentials - this should only be used for development/demo');
      } else {
        return NextResponse.json({ error: 'Not authenticated - no valid session, authorization header, or default credentials found' }, { status: 401 });
      }
    }

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