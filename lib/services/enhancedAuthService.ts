import { DHIS2Client } from '../dhis2';
import { Session } from '../../types/auth';
import { getSession, storeSession, clearSession } from './sessionService';

export interface AuthRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryOn?: number[]; // HTTP status codes to retry on
}

export interface AuthResult {
  success: boolean;
  client?: DHIS2Client;
  session?: Session;
  error?: string;
  retries?: number;
}

/**
 * Enhanced authentication service with retry logic and error handling
 */
export class EnhancedAuthService {
  private static defaultRetryOptions: AuthRetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    retryOn: [401, 403, 429, 500, 502, 503, 504]
  };

  /**
   * Authenticate with DHIS2 with retry logic
   */
  static async authenticateWithRetry(
    serverUrl: string,
    username: string,
    password: string,
    options: AuthRetryOptions = {}
  ): Promise<AuthResult> {
    const opts = { ...this.defaultRetryOptions, ...options };
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= (opts.maxRetries || 3); attempt++) {
      try {
        console.log(`🔐 Authentication attempt ${attempt}/${opts.maxRetries} for ${serverUrl}`);
        
        const client = new DHIS2Client(serverUrl);
        client.setCredentials(username, password);
        
        // Test authentication
        const authResponse = await client.authenticate({ serverUrl, username, password });
        
        if (authResponse.authenticated) {
          console.log('✅ Authentication successful');
          
          // Create session
          const session: Session = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            serverUrl: client['serverUrl'], // Access private property
            token: client['token'] || '',
            username: authResponse.user?.username || username,
            displayName: authResponse.user?.name || username,
            authorities: authResponse.user?.authorities || [],
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          };
          
          // Store session
          await storeSession(session);
          
          return {
            success: true,
            client,
            session,
            retries: attempt - 1
          };
        } else {
          lastError = authResponse.error || 'Authentication failed';
          console.log(`❌ Authentication failed: ${lastError}`);
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`❌ Authentication attempt ${attempt} failed:`, lastError);
        
        // Check if we should retry based on error type
        if (attempt < (opts.maxRetries || 3)) {
          const shouldRetry = this.shouldRetryError(error, opts.retryOn);
          if (shouldRetry) {
            console.log(`⏳ Retrying in ${opts.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
            continue;
          }
        }
      }
      
      // If we reach here and it's not the last attempt, wait before retry
      if (attempt < (opts.maxRetries || 3)) {
        console.log(`⏳ Waiting ${opts.retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
      }
    }
    
    return {
      success: false,
      error: lastError,
      retries: opts.maxRetries || 3
    };
  }

  /**
   * Get authenticated client from session with validation
   */
  static async getAuthenticatedClient(): Promise<AuthResult> {
    try {
      console.log('🔍 Getting authenticated client from session...');
      
      const session = await getSession();
      if (!session) {
        console.log('❌ No session found');
        return { success: false, error: 'No session found' };
      }
      
      // Validate session
      if (session.expiresAt) {
        const expiryDate = new Date(session.expiresAt);
        const now = new Date();
        
        if (now > expiryDate) {
          console.log('❌ Session expired');
          await clearSession();
          return { success: false, error: 'Session expired' };
        }
      }
      
      // Create client from session
      const client = new DHIS2Client(session.serverUrl, session.token);
      
      // Validate client with a test request
      try {
        const testResponse = await client.axiosInstance.get('/me');
        if (testResponse.status === 200) {
          console.log('✅ Session validation successful');
          return { success: true, client, session };
        } else {
          console.log('❌ Session validation failed');
          await clearSession();
          return { success: false, error: 'Session validation failed' };
        }
      } catch (testError) {
        console.error('❌ Session test failed:', testError);
        await clearSession();
        return { success: false, error: 'Session test failed' };
      }
      
    } catch (error) {
      console.error('❌ Error getting authenticated client:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refresh session if needed
   */
  static async refreshSessionIfNeeded(session: Session): Promise<Session | null> {
    try {
      if (!session.expiresAt) {
        return session; // No expiry set, assume valid
      }
      
      const expiryDate = new Date(session.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      const oneHour = 60 * 60 * 1000;
      
      // Refresh if expiring within an hour
      if (timeUntilExpiry < oneHour && timeUntilExpiry > 0) {
        console.log('🔄 Session expiring soon, refreshing...');
        
        // Test current session
        const client = new DHIS2Client(session.serverUrl, session.token);
        const testResponse = await client.axiosInstance.get('/me');
        
        if (testResponse.status === 200) {
          // Extend session
          const refreshedSession: Session = {
            ...session,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          await storeSession(refreshedSession);
          console.log('✅ Session refreshed successfully');
          return refreshedSession;
        }
      }
      
      return session;
    } catch (error) {
      console.error('❌ Session refresh failed:', error);
      return null;
    }
  }

  /**
   * Create authenticated client with fallback options
   */
  static async createClientWithFallback(
    primaryAuth?: { serverUrl: string; username: string; password: string },
    fallbackOptions?: {
      useEnvironment?: boolean;
      useHeaders?: boolean;
    }
  ): Promise<AuthResult> {
    // Try primary authentication if provided
    if (primaryAuth) {
      const result = await this.authenticateWithRetry(
        primaryAuth.serverUrl,
        primaryAuth.username,
        primaryAuth.password
      );
      if (result.success) {
        return result;
      }
      console.log('⚠️ Primary authentication failed, trying fallbacks...');
    }
    
    // Try session-based authentication
    const sessionResult = await this.getAuthenticatedClient();
    if (sessionResult.success) {
      return sessionResult;
    }
    
    // Try environment variables if enabled
    if (fallbackOptions?.useEnvironment) {
      const envUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL;
      const envUsername = process.env.DHIS2_USERNAME;
      const envPassword = process.env.DHIS2_PASSWORD;
      
      if (envUrl && envUsername && envPassword) {
        console.log('🌍 Trying environment variable authentication...');
        const result = await this.authenticateWithRetry(envUrl, envUsername, envPassword);
        if (result.success) {
          return result;
        }
      }
    }
    
    return {
      success: false,
      error: 'All authentication methods failed'
    };
  }

  /**
   * Determine if error should trigger retry
   */
  private static shouldRetryError(error: unknown, retryOn?: number[]): boolean {
    const defaultRetryCodes = [401, 403, 429, 500, 502, 503, 504];
    const retryCodes = retryOn || defaultRetryCodes;
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.status) {
        return retryCodes.includes(axiosError.response.status);
      }
    }
    
    // Retry on network errors
    if (error instanceof Error) {
      const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'];
      return networkErrors.some(errorCode => error.message.includes(errorCode));
    }
    
    return false;
  }

  /**
   * Clear session and cleanup
   */
  static async logout(): Promise<void> {
    try {
      await clearSession();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }
}