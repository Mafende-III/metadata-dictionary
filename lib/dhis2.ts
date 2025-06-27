import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
  public axiosInstance: AxiosInstance;
  private serverUrl: string;
  private credentials: { username: string; password: string } | null = null;
  private token: string | null = null;

  constructor(serverUrl: string, token?: string) {
    this.serverUrl = this.normalizeServerUrl(serverUrl);
    
    if (token) {
      this.token = token;
    }
    
    this.axiosInstance = axios.create({
      baseURL: this.serverUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Basic ${this.token}` })
      }
    });
    
    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        let dhis2Error: DHIS2Error = {
          httpStatusCode: error.response?.status || 500,
          message: error.message,
          status: 'ERROR'
        };
        
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
  
  // Set credentials for authentication
  setCredentials(username: string, password: string): void {
    this.credentials = { username, password };
    this.token = Buffer.from(`${username}:${password}`).toString('base64');
    
    console.log('🔐 Setting credentials for user:', username);
    console.log('🔗 Using base URL:', this.serverUrl);
    
    // Update axios instance with new token
    this.axiosInstance = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.token}`
      }
    });
    
    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        console.error('❌ DHIS2 API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        });
        
        let dhis2Error: DHIS2Error = {
          httpStatusCode: error.response?.status || 500,
          message: error.message,
          status: 'ERROR',
          httpStatus: error.response?.statusText || 'Unknown Error'
        };
        
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
    this.token = token;
    
    // Update axios instance with new token
    this.axiosInstance = axios.create({
      baseURL: this.serverUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.token}`
      }
    });
  }
  
  // Authenticate with DHIS2
  async authenticate(credentials: DHIS2AuthCredentials): Promise<DHIS2AuthResponse> {
    this.serverUrl = this.normalizeServerUrl(credentials.serverUrl);
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
  
  // Test connection to DHIS2
  async testConnection(credentials?: DHIS2AuthCredentials): Promise<DHIS2ConnectionResponse> {
    if (credentials) {
      this.serverUrl = this.normalizeServerUrl(credentials.serverUrl);
      this.setCredentials(credentials.username, credentials.password);
    }
    
    try {
      console.log('🔍 Testing connection with URL:', this.serverUrl);
      
      // Call the /system/info endpoint to get version and system information
      const response = await this.axiosInstance.get('/system/info');
      
      console.log('✅ System info response:', {
        version: response.data.version,
        instanceName: response.data.instanceName,
        serverDate: response.data.serverDate
      });
      
      return {
        connected: true,
        version: response.data.version,
        name: response.data.instanceName || response.data.systemName,
        serverInfo: {
          version: response.data.version,
          revision: response.data.revision,
          build: response.data.buildTime,
          serverDate: response.data.serverDate,
          instanceName: response.data.instanceName,
          systemName: response.data.systemName
        }
      };
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      
      // Try alternative endpoints if main fails
      try {
        console.log('🔄 Trying alternative system endpoint...');
        const altResponse = await this.axiosInstance.get('/me');
        
        return {
          connected: true,
          version: 'Unknown (detected via /me endpoint)',
          name: altResponse.data.displayName || 'DHIS2 Instance',
          serverInfo: {
            version: 'Unknown',
            username: altResponse.data.username || altResponse.data.userCredentials?.username
          }
        };
      } catch (altError: any) {
        return {
          connected: false,
          error: error.message || 'Connection failed'
        };
      }
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
      console.log('🔗 Full URL:', this.serverUrl + '/sqlViews');
      
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
        url: this.serverUrl + '/sqlViews',
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
}

// Create a client from the environment variables
export const createDefaultClient = (): DHIS2Client => {
  const serverUrl = process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api';
  return new DHIS2Client(serverUrl);
}; 