/**
 * DHIS2 Client Factory with Standardized SSL Configuration
 * 
 * This utility provides a consistent way to create DHIS2Client instances
 * with proper SSL configuration handling across the entire application.
 */

import { DHIS2Client } from '../dhis2';

interface DHIS2ClientOptions {
  allowSelfSignedCerts?: boolean;
  timeout?: number;
  [key: string]: any;
}

interface CreateClientParams {
  serverUrl: string;
  username?: string;
  password?: string;
  token?: string;
  options?: DHIS2ClientOptions;
}

/**
 * Determine if a DHIS2 instance needs SSL certificate bypass
 * This should only apply to known internal/development instances
 */
export function needsSelfSignedCertBypass(serverUrl: string): boolean {
  // Only apply SSL bypass to specifically known internal instances
  const knownInternalInstances = [
    'localhost',
    '127.0.0.1',
    '192.168.',
    '10.',
    '172.16.',
    '172.17.',
    '172.18.',
    '172.19.',
    '172.20.',
    '172.21.',
    '172.22.',
    '172.23.',
    '172.24.',
    '172.25.',
    '172.26.',
    '172.27.',
    '172.28.',
    '172.29.',
    '172.30.',
    '172.31.',
    'hisprwanda.org',
    '197.243.28.37', // Specific internal instance from logs
    'test.',
    'dev.',
    'staging.',
    '.local',
    '.internal'
  ];

  const normalizedUrl = serverUrl.toLowerCase();
  
  // Check for known internal instances only
  const needsBypass = knownInternalInstances.some(pattern => 
    normalizedUrl.includes(pattern)
  );

  if (needsBypass) {
    console.log(`🔓 SSL certificate bypass enabled for known internal instance: ${serverUrl}`);
    console.log(`⚠️ This should only be used for internal/development instances`);
  } else {
    console.log(`🔐 SSL certificate verification enabled for: ${serverUrl}`);
  }

  return needsBypass;
}

/**
 * Create a DHIS2Client with standardized SSL configuration
 */
export function createDHIS2Client(params: CreateClientParams): DHIS2Client {
  const { serverUrl, username, password, token, options = {} } = params;
  
  // Auto-detect SSL configuration if not explicitly provided
  if (options.allowSelfSignedCerts === undefined) {
    options.allowSelfSignedCerts = needsSelfSignedCertBypass(serverUrl);
  }

  // Log SSL configuration for debugging
  console.log(`🔧 Creating DHIS2Client for: ${serverUrl}`);
  console.log(`🔓 SSL bypass: ${options.allowSelfSignedCerts}`);
  
  // Create client with proper parameter order
  const client = new DHIS2Client(serverUrl, token, options);
  
  // Set credentials if provided
  if (username && password) {
    client.setCredentials(username, password);
    console.log(`🔐 Credentials set for user: ${username}`);
  } else if (token) {
    console.log(`🔑 Token authentication configured`);
  }

  return client;
}

/**
 * Create DHIS2Client from instance data with stored SSL configuration
 */
export async function createDHIS2ClientFromInstance(
  instance: any, 
  credentials: { username: string; password: string } | null = null
): Promise<DHIS2Client> {
  if (!instance) {
    throw new Error('Instance data is required');
  }

  // Check if instance has stored SSL configuration
  let allowSelfSignedCerts = false;
  
  if (instance.ssl_config && typeof instance.ssl_config === 'object') {
    // Use stored SSL configuration if available
    allowSelfSignedCerts = instance.ssl_config.allowSelfSignedCerts || false;
    console.log(`🔐 Using stored SSL config for ${instance.name}: bypass=${allowSelfSignedCerts}`);
  } else if (instance.allow_self_signed_certs !== undefined) {
    // Check for direct boolean field
    allowSelfSignedCerts = instance.allow_self_signed_certs;
    console.log(`🔐 Using direct SSL config for ${instance.name}: bypass=${allowSelfSignedCerts}`);
  } else {
    // Fall back to URL-based detection
    allowSelfSignedCerts = needsSelfSignedCertBypass(instance.base_url);
    console.log(`🔍 Auto-detected SSL config for ${instance.name}: bypass=${allowSelfSignedCerts}`);
  }

  const clientParams: CreateClientParams = {
    serverUrl: instance.base_url,
    options: {
      allowSelfSignedCerts
    }
  };

  if (credentials) {
    clientParams.username = credentials.username;
    clientParams.password = credentials.password;
  }

  return createDHIS2Client(clientParams);
}

/**
 * Create DHIS2Client from session data
 */
export function createDHIS2ClientFromSession(session: any): DHIS2Client {
  if (!session || !session.serverUrl) {
    throw new Error('Session with serverUrl is required');
  }

  return createDHIS2Client({
    serverUrl: session.serverUrl,
    token: session.token,
    options: {
      allowSelfSignedCerts: needsSelfSignedCertBypass(session.serverUrl)
    }
  });
}

/**
 * Safe SSL configuration test
 */
export async function testSSLConfiguration(serverUrl: string): Promise<{
  needsSelfSignedCerts: boolean;
  testResult: 'success' | 'ssl_error' | 'other_error';
  error?: string;
}> {
  try {
    // Test with SSL verification enabled first
    const clientSecure = createDHIS2Client({
      serverUrl,
      options: { allowSelfSignedCerts: false }
    });

    await clientSecure.get('/me');
    
    return {
      needsSelfSignedCerts: false,
      testResult: 'success'
    };
  } catch (error: any) {
    if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || 
        error.message?.includes('self-signed certificate')) {
      
      try {
        // Test with SSL bypass enabled
        const clientInsecure = createDHIS2Client({
          serverUrl,
          options: { allowSelfSignedCerts: true }
        });

        await clientInsecure.get('/me');
        
        return {
          needsSelfSignedCerts: true,
          testResult: 'success'
        };
      } catch (retryError: any) {
        return {
          needsSelfSignedCerts: true,
          testResult: 'other_error',
          error: retryError.message
        };
      }
    } else {
      return {
        needsSelfSignedCerts: false,
        testResult: 'other_error',
        error: error.message
      };
    }
  }
}

/**
 * Migration utility to update existing DHIS2Client instantiations
 */
export function migrateDHIS2ClientCreation(
  serverUrl: string,
  existingAuth?: string | { username: string; password: string },
  existingOptions?: any
): DHIS2Client {
  console.warn('🔄 Migrating legacy DHIS2Client creation');
  
  let clientParams: CreateClientParams = {
    serverUrl,
    options: {
      ...existingOptions,
      allowSelfSignedCerts: needsSelfSignedCertBypass(serverUrl)
    }
  };

  if (typeof existingAuth === 'string') {
    clientParams.token = existingAuth;
  } else if (existingAuth && typeof existingAuth === 'object') {
    clientParams.username = existingAuth.username;
    clientParams.password = existingAuth.password;
  }

  return createDHIS2Client(clientParams);
}

// Export individual utilities for specific use cases
export { DHIS2Client };
export default createDHIS2Client;