import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import {
  DHIS2AuthCredentials,
  DHIS2AuthResponse,
  DHIS2ConnectionResponse,
  DHIS2Error,
  DHIS2Response
} from '../types/dhis2';
import { DataElement, Dashboard, Indicator, MetadataFilter, SQLView } from '../types/metadata';
import { Session } from '../types/auth';

// DHIS2 API client
export class DHIS2Client {
  private baseURL: string;
  public axiosInstance: AxiosInstance;
  private authToken?: string;
  private credentials?: { username: string; password: string };
  private allowSelfSignedCerts: boolean = false;
  private authType: 'basic' | 'bearer' | 'apitoken' = 'basic';

  constructor(serverUrl: string, authToken?: string, options?: { allowSelfSignedCerts?: boolean }) {
    // Clean and normalize the server URL
    this.baseURL = this.normalizeServerUrl(serverUrl);
    this.allowSelfSignedCerts = options?.allowSelfSignedCerts || false;
    
    console.log('🔧 DHIS2Client Constructor DEBUG:', {
      serverUrl: this.baseURL,
      allowSelfSignedCerts: this.allowSelfSignedCerts,
      options
    });

    // Create axios instance with enhanced configuration
    const axiosConfig: any = {
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Handle self-signed certificates if needed
    if (this.allowSelfSignedCerts) {
      console.log('🔓 WARNING: SSL certificate verification disabled for:', this.baseURL);
      console.log('⚠️ This should only be used for internal/development instances');
      
      // Only set HTTPS agent for HTTPS URLs
      if (this.baseURL.startsWith('https://')) {
        axiosConfig.httpsAgent = new (require('https').Agent)({
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined, // Skip hostname verification
        });
      }
    }

    this.axiosInstance = axios.create(axiosConfig);
    
    // Set auth token if provided
    if (authToken) {
      this.authToken = authToken;
      this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add request interceptor for debugging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('🔴 Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const enhancedError = this.enhanceError(error);
        console.error('🔴 Response interceptor error:', enhancedError);
        return Promise.reject(enhancedError);
      }
    );
  }
  
  // Normalize server URL to ensure it ends with /api
  private normalizeServerUrl(url: string): string {
    url = url.trim();
    
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Handle different URL patterns for DHIS2 instances
    if (url.includes('/api')) {
      // URL already contains /api, use as is
      console.log('🔗 Using provided API URL:', url);
      return url;
    } else if (url.includes('/dhis')) {
      // URL contains dhis path, add /api
      url = `${url}/api`;
      console.log('🔗 Added /api to dhis URL:', url);
      return url;
    } else {
      // Standard case, add /api
      url = `${url}/api`;
      console.log('🔗 Added /api to standard URL:', url);
      return url;
    }
  }
  
  // Set credentials for authentication (support multiple auth types)
  setCredentials(username: string, password: string): void {
    this.credentials = { username, password };
    
    // Check if password looks like a Personal Access Token
    if (password.startsWith('d2pat_')) {
      this.authType = 'bearer';
      this.authToken = password;
      console.log('🔑 Detected Personal Access Token - using Bearer authentication');
    } else {
      this.authType = 'basic';
      this.authToken = Buffer.from(`${username}:${password}`).toString('base64');
      console.log('🔑 Using Basic Authentication');
    }
    
    console.log('🔐 Setting credentials for user:', username);
    console.log('🔗 Using base URL:', this.baseURL);
    console.log('🔓 Certificate bypass enabled:', this.allowSelfSignedCerts);
    
    // Debug authentication details
    console.log('🔧 AUTH DEBUG:', {
      usernameLength: username.length,
      passwordLength: password.length,
      tokenLength: this.authToken.length,
      tokenPreview: this.authToken.substring(0, 12) + '...',
      expectedHeader: `Basic ${this.authToken.substring(0, 12)}...`
    });
    
    // Create HTTPS agent that can handle self-signed certificates
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !this.allowSelfSignedCerts,
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384'
    });
    
    // Create headers based on authentication type
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.authType === 'bearer') {
      authHeaders['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.authType === 'basic') {
      authHeaders['Authorization'] = `Basic ${this.authToken}`;
    }
    
    // Update axios instance with new token and SSL settings
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      httpsAgent: httpsAgent,
      timeout: 30000, // 30 second timeout
      headers: authHeaders
    });

    if (this.allowSelfSignedCerts) {
      console.log('🔓 SSL certificate verification disabled for internal instance');
    }
    
    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        console.error('❌ DHIS2 API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          code: error.code,
          responseHeaders: error.response?.headers,
          responseData: error.response?.data,
          requestHeaders: error.config?.headers,
          requestUrl: error.config?.url,
          fullUrl: error.config?.baseURL + error.config?.url
        });
        
        let dhis2Error: DHIS2Error = {
          httpStatusCode: error.response?.status || 500,
          message: error.message,
          status: 'ERROR',
          httpStatus: error.response?.statusText || 'Unknown Error'
        };
        
        // Enhanced error handling for certificate issues
        if (error.code === 'CERT_HAS_EXPIRED') {
          dhis2Error.message = 'SSL Certificate has expired. Contact your DHIS2 administrator to renew the certificate.';
        } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
          dhis2Error.message = 'Self-signed certificate detected. This instance may need certificate verification disabled.';
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          dhis2Error.message = 'Unable to verify SSL certificate. This may be a self-signed or invalid certificate.';
        } else if (error.code === 'CERT_UNTRUSTED') {
          dhis2Error.message = 'Untrusted SSL certificate. This certificate is not signed by a trusted authority.';
        }
        
        if (error.response?.data) {
          dhis2Error = {
            ...dhis2Error,
            ...error.response.data
          };
        }
        
        return Promise.reject(dhis2Error);
      }
    );
  }
  
  // Set token directly
  setToken(token: string): void {
    this.authToken = token;
    
    // Create HTTPS agent that preserves certificate settings
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !this.allowSelfSignedCerts,
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384'
    });
    
    // Update axios instance with new token
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      httpsAgent: httpsAgent,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.authToken}`
      }
    });
  }
  
  // Authenticate with DHIS2
  async authenticate(credentials: DHIS2AuthCredentials): Promise<DHIS2AuthResponse> {
    this.baseURL = this.normalizeServerUrl(credentials.serverUrl);
    this.setCredentials(credentials.username, credentials.password);
    
    try {
      // Call the /me endpoint to check authentication
      const response = await this.axiosInstance.get('/me');
      
      return {
        authenticated: true,
        user: {
          id: response.data.id,
          name: response.data.displayName,
          username: response.data.userCredentials.username,
          authorities: response.data.userCredentials.authorities || []
        }
      };
    } catch (error: any) {
      return {
        authenticated: false,
        error: error.message || 'Authentication failed'
      };
    }
  }
  
  // Test multiple authentication methods for problematic instances
  async testMultipleAuthMethods(username: string, password: string): Promise<{ method: string; success: boolean; details: any; headers?: any }[]> {
    const results = [];
    
    // Method 1: Basic Auth
    try {
      const basicToken = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await this.axiosInstance.get('/me', {
        headers: { 'Authorization': `Basic ${basicToken}` }
      });
      results.push({
        method: 'Basic Authentication',
        success: true,
        details: { status: response.status, user: response.data.displayName }
      });
    } catch (error) {
      results.push({
        method: 'Basic Authentication', 
        success: false,
        details: { status: error.response?.status, message: error.message }
      });
    }
    
    // Method 2: Bearer Token (if password is PAT)
    if (password.startsWith('d2pat_')) {
      try {
        const response = await this.axiosInstance.get('/me', {
          headers: { 'Authorization': `Bearer ${password}` }
        });
        results.push({
          method: 'Bearer Token (PAT)',
          success: true,
          details: { status: response.status, user: response.data.displayName }
        });
      } catch (error) {
        results.push({
          method: 'Bearer Token (PAT)',
          success: false,
          details: { status: error.response?.status, message: error.message }
        });
      }
    }
    
    // Method 3: ApiToken Header
    if (password.startsWith('d2pat_')) {
      try {
        const response = await this.axiosInstance.get('/me', {
          headers: { 'ApiToken': password }
        });
        results.push({
          method: 'ApiToken Header',
          success: true,
          details: { status: response.status, user: response.data.displayName }
        });
      } catch (error) {
        results.push({
          method: 'ApiToken Header',
          success: false,
          details: { status: error.response?.status, message: error.message }
        });
      }
    }
    
    // Method 4: PAT as username with empty password
    if (password.startsWith('d2pat_')) {
      try {
        const patToken = Buffer.from(`${password}:`).toString('base64');
        const response = await this.axiosInstance.get('/me', {
          headers: { 'Authorization': `Basic ${patToken}` }
        });
        results.push({
          method: 'PAT as Username (Basic)',
          success: true,
          details: { status: response.status, user: response.data.displayName }
        });
      } catch (error) {
        results.push({
          method: 'PAT as Username (Basic)',
          success: false,
          details: { status: error.response?.status, message: error.message }
        });
      }
    }
    
    console.log('🧪 Multi-authentication test results:', results);
    return results;
  }

  // Test different authentication approaches
  async testAuthentication(): Promise<{ method: string; success: boolean; details: any }[]> {
    const results = [];
    
    // Test 1: Basic Auth with /api/me
    try {
      console.log('🧪 Testing: Basic Auth + /api/me');
      const response = await this.axiosInstance.get('/me');
      results.push({
        method: 'Basic Auth + /api/me',
        success: true,
        details: { status: response.status, data: response.data }
      });
    } catch (error) {
      results.push({
        method: 'Basic Auth + /api/me',
        success: false,
        details: { status: error.response?.status, message: error.message }
      });
    }

    // Test 2: Basic Auth with /api/system/info
    try {
      console.log('🧪 Testing: Basic Auth + /api/system/info');
      const response = await this.axiosInstance.get('/system/info');
      results.push({
        method: 'Basic Auth + /api/system/info',
        success: true,
        details: { status: response.status, data: response.data }
      });
    } catch (error) {
      results.push({
        method: 'Basic Auth + /api/system/info',
        success: false,
        details: { status: error.response?.status, message: error.message }
      });
    }

    // Test 3: Try without /api prefix (raw DHIS2 endpoints)
    try {
      console.log('🧪 Testing: Direct DHIS2 base URL');
      const baseUrl = this.baseURL.replace('/api', '');
      const response = await this.axiosInstance.get('/', { baseURL: baseUrl });
      results.push({
        method: 'Direct base URL',
        success: true,
        details: { status: response.status, url: baseUrl }
      });
    } catch (error) {
      results.push({
        method: 'Direct base URL',
        success: false,
        details: { status: error.response?.status, message: error.message }
      });
    }

    console.log('🧪 Authentication test results:', results);
    return results;
  }

  // Test connection to DHIS2 instance
  async testConnection(): Promise<DHIS2ConnectionResponse> {
    try {
      console.log('🔍 Testing connection to:', this.baseURL);
      
      // First check if this is an HTTP instance and we're in a browser environment
      const isHttpInstance = this.baseURL.startsWith('http://');
      const isBrowser = typeof window !== 'undefined';
      const isHttpsPage = isBrowser && window.location.protocol === 'https:';
      
      if (isHttpInstance && isHttpsPage) {
        console.warn('⚠️ HTTP instance detected from HTTPS page - this will likely fail due to mixed content policy');
        console.warn('💡 Consider using the server-side proxy for HTTP instances');
        
        // Provide helpful guidance for developers
        const helpMessage = `
🚨 Mixed Content Security Issue Detected

Your DHIS2 instance (${this.baseURL}) uses HTTP, but this application is served over HTTPS.
Browsers block HTTP requests from HTTPS pages for security reasons.

🔧 Solutions for Developers:
1. Use the built-in server-side proxy (automatically handles HTTP instances)
2. Serve your app over HTTP for local development
3. Set up HTTPS on your local DHIS2 instance
4. Use ngrok or similar tools to create HTTPS tunnels

📋 For Production:
- Ensure your DHIS2 instance uses HTTPS
- Update instance configuration in the admin panel
        `;
        
        console.warn(helpMessage);
      }
      
      // First, try a simple test to see if the server responds at all
      try {
        console.log('🔧 Testing basic server response (no auth)...');
        const basicTest = await this.axiosInstance.get('/', { 
          headers: {} // Remove auth headers for basic test
        });
        console.log('✅ Server responds to basic request:', basicTest.status);
      } catch (basicError) {
        console.log('📋 Basic server test result:', {
          status: basicError.response?.status,
          message: basicError.message,
          code: basicError.code
        });
      }

      // Try primary endpoint - system/info
      try {
        console.log('🔧 Making request to /system/info with headers:', {
          baseURL: this.axiosInstance.defaults.baseURL,
          headers: this.axiosInstance.defaults.headers,
          timeout: this.axiosInstance.defaults.timeout
        });
        
        const response = await this.axiosInstance.get('/system/info');
        console.log('✅ Connection successful via /system/info');
        console.log('📝 Response details:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          dataKeys: Object.keys(response.data)
        });
        
        return {
          connected: true,
          version: response.data.version,
          name: response.data.instanceName || response.data.name || 'DHIS2 Instance',
          serverInfo: {
            version: response.data.version,
            revision: response.data.revision,
            build: response.data.build,
            serverDate: response.data.serverDate
          }
        };
      } catch (systemInfoError) {
        console.warn('⚠️ /system/info failed, trying /me endpoint:', systemInfoError.message);
        
        // Fallback to /me endpoint
        try {
          console.log('🔧 Trying /me endpoint with same credentials...');
          const meResponse = await this.axiosInstance.get('/me');
          console.log('✅ Connection successful via /me endpoint');
          console.log('📝 /me Response details:', {
            status: meResponse.status,
            statusText: meResponse.statusText,
            dataKeys: Object.keys(meResponse.data),
            userInfo: {
              id: meResponse.data.id,
              displayName: meResponse.data.displayName,
              username: meResponse.data.userCredentials?.username
            }
          });
          
          // Try to get version info separately
          let versionInfo = null;
          try {
            const versionResponse = await this.axiosInstance.get('/system/version');
            versionInfo = versionResponse.data;
          } catch (versionError) {
            console.warn('Version info not available:', versionError.message);
          }
          
          return {
            connected: true,
            version: versionInfo?.version || 'Unknown',
            name: meResponse.data.displayName || meResponse.data.name || 'DHIS2 Instance',
            serverInfo: versionInfo || {
              version: 'Unknown',
              revision: 'Unknown',
              build: 'Unknown',
              serverDate: new Date().toISOString()
            }
          };
        } catch (meError) {
          console.error('❌ Both /system/info and /me endpoints failed');
          
          // Run comprehensive authentication tests
          console.log('🧪 Running comprehensive authentication diagnostics...');
          if (this.credentials) {
            await this.testMultipleAuthMethods(this.credentials.username, this.credentials.password);
          }
          await this.testAuthentication();
          
          // Provide specific guidance based on error type
          if (isHttpInstance && isHttpsPage) {
            throw new Error(`
Mixed Content Security Error: Cannot connect to HTTP instance from HTTPS page.

🔧 Quick Fixes:
1. Use the server-side proxy (recommended for production)
2. Serve your app over HTTP for local development
3. Set up HTTPS on your local DHIS2 instance

Current instance: ${this.baseURL}
Page protocol: ${window.location.protocol}
            `);
          }
          
          throw new Error(`Connection failed: ${meError.message}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      
      // Enhanced error handling with developer guidance
      let errorMessage = error.message;
      
      // Check for certificate-related errors
      if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || 
          error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          error.code === 'CERT_UNTRUSTED' ||
          error.message.includes('self-signed certificate')) {
        errorMessage = `
SSL Certificate Error: Self-signed or untrusted certificate detected

🔧 Solutions for Internal DHIS2 Instances:
1. Contact your DHIS2 administrator to install a valid SSL certificate
2. For internal/development use, the system can bypass certificate verification
3. Ensure your network allows access to this instance
4. Check if a VPN connection is required

Instance: ${this.baseURL}
Error: ${error.code || 'Certificate verification failed'}

⚠️ Note: Bypassing certificate verification should only be used for trusted internal instances.
        `;
      } else if (error.code === 'CERT_HAS_EXPIRED') {
        errorMessage = `
SSL Certificate Expired: The certificate for this instance has expired

🔧 Solutions:
1. Contact your DHIS2 administrator to renew the certificate
2. Verify the current date/time on your system
3. Check if this is a temporary certificate issue

Instance: ${this.baseURL}
        `;
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = `
Network Error: Cannot reach DHIS2 instance at ${this.baseURL}

🔍 Troubleshooting Steps:
1. Verify the URL is correct and accessible
2. Check if the DHIS2 instance is running
3. Ensure there are no firewall restrictions
4. For local instances, try using IP address instead of localhost
5. Check if VPN connection is required for internal instances

For HTTP instances from HTTPS apps, use the server-side proxy feature.
        `;
      } else if (error.httpStatusCode === 401) {
        errorMessage = `
Authentication Failed: Invalid credentials for ${this.baseURL}

🔐 Check:
1. Username and password are correct
2. User account is active
3. User has sufficient permissions
4. Instance allows API access
        `;
      } else if (error.httpStatusCode === 403) {
        errorMessage = `
Access Forbidden: User does not have sufficient permissions

👤 Required Permissions:
1. API access rights
2. Read access to metadata
3. System info access (for connection testing)
        `;
      } else if (error.httpStatusCode === 404) {
        errorMessage = `
Endpoint Not Found: The DHIS2 API endpoint was not found

🔍 Possible Issues:
1. Incorrect base URL (should end with /api)
2. DHIS2 version too old (requires 2.30+)
3. Custom DHIS2 deployment with different paths
        `;
      }
      
      return {
        connected: false,
        error: errorMessage
      };
    }
  }
  
  // Get data elements
  async getDataElements(filters?: MetadataFilter): Promise<DHIS2Response<DataElement[]>> {
    const params: Record<string, any> = {
      fields: '*,categoryCombo[id,name,displayName],dataElementGroups[id,name,displayName]',
      paging: true,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50
    };
    
    // Add search if provided
    if (filters?.search) {
      params.filter = `displayName:ilike:${filters.search}`;
    }
    
    // Add sorting if provided
    if (filters?.sortBy) {
      params.order = `${filters.sortBy}:${filters.sortDirection || 'asc'}`;
    }
    
    const response = await this.axiosInstance.get('/dataElements', { params });
    return response.data;
  }
  
  // Get indicators
  async getIndicators(filters?: MetadataFilter): Promise<DHIS2Response<Indicator[]>> {
    const params: Record<string, any> = {
      fields: '*,indicatorType[id,name,displayName],indicatorGroups[id,name,displayName]',
      paging: true,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50
    };
    
    // Add search if provided
    if (filters?.search) {
      params.filter = `displayName:ilike:${filters.search}`;
    }
    
    // Add sorting if provided
    if (filters?.sortBy) {
      params.order = `${filters.sortBy}:${filters.sortDirection || 'asc'}`;
    }
    
    const response = await this.axiosInstance.get('/indicators', { params });
    return response.data;
  }
  
  // Get dashboards
  async getDashboards(filters?: MetadataFilter): Promise<DHIS2Response<Dashboard[]>> {
    const params: Record<string, any> = {
      fields: '*,dashboardItems[*,visualization[id,name,displayName],chart[id,name,displayName],map[id,name,displayName]]',
      paging: true,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50
    };
    
    // Add search if provided
    if (filters?.search) {
      params.filter = `displayName:ilike:${filters.search}`;
    }
    
    // Add sorting if provided
    if (filters?.sortBy) {
      params.order = `${filters.sortBy}:${filters.sortDirection || 'asc'}`;
    }
    
    const response = await this.axiosInstance.get('/dashboards', { params });
    return response.data;
  }
  
  // Get SQL views
  async getSQLViews(filters?: MetadataFilter): Promise<DHIS2Response<SQLView[]>> {
    const params: Record<string, any> = {
      fields: 'id,name,displayName,type,description,sqlQuery,cacheStrategy',
      paging: true,
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 100
    };
    
    // Add search if provided
    if (filters?.search) {
      params.filter = `displayName:ilike:${filters.search}`;
    }
    
    // Add sorting if provided
    if (filters?.sortBy) {
      params.order = `${filters.sortBy}:${filters.sortDirection || 'asc'}`;
    }
    
    try {
      console.log('🔍 Fetching SQL views with params:', params);
      console.log('🔗 Full URL:', this.baseURL + '/sqlViews');
      
      const response = await this.axiosInstance.get('/sqlViews', { params });
      
      console.log('✅ SQL views response:', {
        total: response.data.pager?.total || response.data.sqlViews?.length || 0,
        pageSize: response.data.pager?.pageSize,
        page: response.data.pager?.page,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data
      });
      
      // Handle both response formats
      if (Array.isArray(response.data)) {
        // Direct array response - convert to expected format
        return {
          sqlViews: response.data,
          pager: {
            page: 1,
            pageSize: response.data.length,
            total: response.data.length,
            pageCount: 1
          }
        };
      } else {
        // Standard object response
        return response.data;
      }
    } catch (error: any) {
      console.error('❌ Error fetching SQL views:', error);
      console.error('❌ Request details:', {
        url: this.baseURL + '/sqlViews',
        params,
        status: error.httpStatusCode || error.status
      });
      
      throw error;
    }
  }
  
  // Get data element groups
  async getDataElementGroups(includeItemCounts: boolean = true): Promise<any> {
    const fields = includeItemCounts 
      ? 'id,name,displayName,dataElements~size'
      : 'id,name,displayName';
    
    const response = await this.axiosInstance.get('/dataElementGroups', {
      params: {
        fields,
        pageSize: 100,
        order: 'name:asc'
      }
    });
    
    return response.data;
  }

  // Get indicator groups
  async getIndicatorGroups(includeItemCounts: boolean = true): Promise<any> {
    const fields = includeItemCounts 
      ? 'id,name,displayName,indicators~size'
      : 'id,name,displayName';
    
    const response = await this.axiosInstance.get('/indicatorGroups', {
      params: {
        fields,
        pageSize: 100,
        order: 'name:asc'
      }
    });
    
    return response.data;
  }

  // Get programs (for program indicators)
  async getPrograms(includeItemCounts: boolean = true): Promise<any> {
    const fields = includeItemCounts 
      ? 'id,name,displayName,programIndicators~size'
      : 'id,name,displayName';
    
    const response = await this.axiosInstance.get('/programs', {
      params: {
        fields,
        pageSize: 100,
        order: 'name:asc'
      }
    });
    
    return response.data;
  }

  // Get metadata group with items
  async getMetadataGroupWithItems(groupType: string, groupId: string): Promise<any> {
    let endpoint = '';
    let itemsField = '';
    
    switch (groupType) {
      case 'dataElements':
        endpoint = `/dataElementGroups/${groupId}`;
        itemsField = 'dataElements[id,name,displayName]';
        break;
      case 'indicators':
        endpoint = `/indicatorGroups/${groupId}`;
        itemsField = 'indicators[id,name,displayName]';
        break;
      case 'programIndicators':
        endpoint = `/programs/${groupId}`;
        itemsField = 'programIndicators[id,name,displayName]';
        break;
      default:
        throw new Error(`Unsupported group type: ${groupType}`);
    }

    const response = await this.axiosInstance.get(endpoint, {
      params: { fields: `id,name,displayName,${itemsField}` }
    });
    
    return response.data;
  }
  
  // Get metadata by ID and type
  async getMetadataById(type: string, id: string): Promise<any> {
    let endpoint = '';
    let fields = '*';
    
    switch (type.toUpperCase()) {
      case 'DATA_ELEMENT':
        endpoint = `/dataElements/${id}`;
        fields = '*,categoryCombo[id,name,displayName],dataElementGroups[id,name,displayName]';
        break;
      case 'INDICATOR':
        endpoint = `/indicators/${id}`;
        fields = '*,indicatorType[id,name,displayName],indicatorGroups[id,name,displayName]';
        break;
      case 'DASHBOARD':
        endpoint = `/dashboards/${id}`;
        fields = '*,dashboardItems[*,visualization[id,name,displayName],chart[id,name,displayName],map[id,name,displayName]]';
        break;
      case 'SQL_VIEW':
        endpoint = `/sqlViews/${id}`;
        fields = '*';
        break;
      default:
        throw new Error(`Unsupported metadata type: ${type}`);
    }
    
    const params = { fields };
    const response = await this.axiosInstance.get(endpoint, { params });
    return response.data;
  }
  
  // Create a DHIS2 client from session
  static fromSession(session: Session): DHIS2Client {
    const client = new DHIS2Client(session.serverUrl);
    client.setToken(session.token);
    return client;
  }

  // Enable/disable self-signed certificate support
  setAllowSelfSignedCerts(allow: boolean): void {
    this.allowSelfSignedCerts = allow;
    
    if (allow) {
      console.log('🔓 WARNING: Disabling SSL certificate verification');
      console.log('⚠️ Only use this for internal/development instances');
    } else {
      console.log('🔒 SSL certificate verification enabled');
    }
    
    // Recreate axios instance with new SSL settings
    if (this.credentials) {
      this.setCredentials(this.credentials.username, this.credentials.password);
    }
  }

  private enhanceError(error: any): DHIS2Error {
    let dhis2Error: DHIS2Error = {
      httpStatusCode: error.response?.status || 500,
      message: error.message,
      status: 'ERROR',
      httpStatus: error.response?.statusText || 'Unknown Error'
    };
    
    // Enhanced error handling for certificate issues
    if (error.code === 'CERT_HAS_EXPIRED') {
      dhis2Error.message = 'SSL Certificate has expired. Contact your DHIS2 administrator to renew the certificate.';
    } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      dhis2Error.message = 'Self-signed certificate detected. This instance may need certificate verification disabled.';
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      dhis2Error.message = 'Unable to verify SSL certificate. This may be a self-signed or invalid certificate.';
    } else if (error.code === 'CERT_UNTRUSTED') {
      dhis2Error.message = 'Untrusted SSL certificate. This certificate is not signed by a trusted authority.';
    }
    
    if (error.response?.data) {
      dhis2Error = {
        ...dhis2Error,
        ...error.response.data
      };
    }
    
    return dhis2Error;
  }
}

// Create a client from the environment variables
export const createDefaultClient = (): DHIS2Client => {
  const serverUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
  return new DHIS2Client(serverUrl);
}; 