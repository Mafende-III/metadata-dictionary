import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';

// Handle POST request for testing DHIS2 connection
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { serverUrl, username, password, allowSelfSignedCerts } = await req.json();
    
    // Comprehensive debugging
    console.log('🔧 TEST CONNECTION DEBUG:', {
      serverUrl,
      username: username ? `${username.substring(0, 3)}***` : 'not provided',
      hasPassword: !!password,
      allowSelfSignedCerts,
      protocol: serverUrl?.startsWith('https://') ? 'HTTPS' : serverUrl?.startsWith('http://') ? 'HTTP' : 'UNKNOWN'
    });
    
    // Validate request
    if (!serverUrl) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      );
    }
    
    // Create DHIS2 client and test connection
    console.log('🔧 Creating DHIS2Client with allowSelfSignedCerts:', allowSelfSignedCerts);
    const dhis2Client = new DHIS2Client(serverUrl, undefined, {
      allowSelfSignedCerts: allowSelfSignedCerts || false
    });
    
    // If credentials are provided, set them
    if (username && password) {
      dhis2Client.setCredentials(username, password);
    }
    
    // Test connection
    const connectionResponse = await dhis2Client.testConnection();
    
    // Add information about certificate handling
    if (allowSelfSignedCerts && connectionResponse.connected) {
      connectionResponse.securityNote = 'SSL certificate verification was disabled for this connection';
    }
    
    // Return the connection response
    return NextResponse.json(connectionResponse);
  } catch (error: any) {
    console.error('DHIS2 Connection test error:', error);
    
    // Enhanced error handling for certificate issues
    let errorResponse = { 
      connected: false,
      error: error.message || 'Failed to test connection'
    };

    // Detect certificate-related errors and suggest solutions
    if (error.message.includes('self-signed certificate') || 
        error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
        error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        error.code === 'CERT_UNTRUSTED') {
      
      errorResponse = {
        connected: false,
        error: 'Self-signed certificate detected',
        details: 'This DHIS2 instance uses a self-signed or untrusted SSL certificate.',
        suggestions: [
          'Contact your DHIS2 administrator to install a valid SSL certificate',
          'For internal instances, you can bypass certificate verification (not recommended for production)',
          'Ensure you trust this instance before proceeding'
        ],
        certificateIssue: true,
        canBypassCertificate: true
      };
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      errorResponse = {
        connected: false,
        error: 'SSL certificate has expired',
        details: 'The SSL certificate for this DHIS2 instance has expired.',
        suggestions: [
          'Contact your DHIS2 administrator to renew the certificate',
          'Verify the current date/time on your system',
          'Check if this is a temporary issue'
        ],
        certificateIssue: true
      };
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 