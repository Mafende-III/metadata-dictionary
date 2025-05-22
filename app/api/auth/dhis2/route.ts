import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';

// Handle POST request for DHIS2 authentication
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { serverUrl, username, password } = await req.json();
    
    // Validate request
    if (!serverUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create DHIS2 client and authenticate
    const dhis2Client = new DHIS2Client(serverUrl);
    const authResponse = await dhis2Client.authenticate({
      serverUrl,
      username,
      password,
    });
    
    // Return the authentication response
    if (authResponse.authenticated) {
      if (!authResponse.user) {
        return NextResponse.json(
          { error: 'Authentication succeeded but user data is missing' },
          { status: 500 }
        );
      }
      return NextResponse.json(authResponse);
    } else {
      return NextResponse.json(
        { error: authResponse.error || 'Authentication failed' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('DHIS2 Authentication error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 