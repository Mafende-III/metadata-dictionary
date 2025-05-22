import { ExistingSqlView } from '../types/sqlView';

export class SqlViewService {
  constructor(private baseUrl: string, private auth: string) {
    // Ensure baseUrl doesn't have trailing slash and includes /api
    if (!baseUrl.endsWith('/api')) {
      this.baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
    }
  }

  async discoverExistingSqlViews(): Promise<ExistingSqlView[]> {
    const response = await fetch(`${this.baseUrl}/sqlViews.json?paging=false&fields=id,name,description,type,cacheStrategy,lastUpdated`, {
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SQL views: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.sqlViews || [];
  }

  async executeView(uid: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sqlViews/${uid}/data.json`, {
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SQL View execution failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  async validateView(uid: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      console.log(`Testing connection to: ${this.baseUrl}/sqlViews/${uid}/data.json`);
      console.log(`Using auth: ${this.auth ? 'Present' : 'Missing'}`);
      
      const response = await fetch(`${this.baseUrl}/sqlViews/${uid}/data.json`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { 
          isValid: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
      
      const data = await response.json();
      console.log('SQL View validation successful:', data);
      return { isValid: true };
      
    } catch (error) {
      console.error('SQL View validation error:', error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createSqlView(payload: any): Promise<{ uid: string }> {
    const response = await fetch(`${this.baseUrl}/sqlViews`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create SQL view: ${response.statusText}`);
    }
    
    const result = await response.json();
    return { uid: result.response.uid };
  }
} 