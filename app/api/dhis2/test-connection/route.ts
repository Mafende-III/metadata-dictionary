import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';

// Handle POST request for testing DHIS2 connection
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { serverUrl, username, password } = await req.json();
    
    // Validate request
    if (!serverUrl) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      );
    }
    
    // Create DHIS2 client and test connection
    const dhis2Client = new DHIS2Client(serverUrl);
    
    // If credentials are provided, set them
    if (username && password) {
      dhis2Client.setCredentials(username, password);
    }
    
    // Test connection
    const connectionResponse = await dhis2Client.testConnection();
    
    // Return the connection response
    return NextResponse.json(connectionResponse);
  } catch (error: any) {
    console.error('DHIS2 Connection test error:', error);
    
    return NextResponse.json(
      { 
        connected: false,
        error: error.message || 'Failed to test connection'
      },
      { status: 500 }
    );
  }
} 