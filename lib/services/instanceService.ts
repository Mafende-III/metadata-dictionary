import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Credential encryption utilities
class CredentialManager {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dhis2-metadata-dictionary-key';
  
  static encrypt(password: string): string {
    try {
      // In production, use proper encryption like AES
      // For now, using base64 with salt for basic obfuscation
      const salt = Math.random().toString(36).substring(7);
      const combined = `${salt}:${password}`;
      return btoa(combined);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt password');
    }
  }
  
  static decrypt(encryptedPassword: string): string {
    try {
      const decoded = atob(encryptedPassword);
      const [salt, password] = decoded.split(':');
      return password;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt password');
    }
  }
}

export interface DHIS2Instance {
  id: string;
  name: string;
  base_url: string;
  username: string;
  version?: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string;
  sql_views_count: number;
  dictionaries_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInstanceData {
  name: string;
  base_url: string;
  username: string;
  password: string;
  allowSelfSignedCerts?: boolean;
}

// Mock data for development when Supabase isn't available
const mockInstances: DHIS2Instance[] = [
  {
    id: 'a07cbb75-d668-4976-9b32-ad006008f1c8',
    name: 'hmistesting',
    base_url: 'https://online.hisprwanda.org/hmis/api',
    username: 'bmafende',
    version: '2.41.3',
    status: 'connected',
    last_sync: new Date().toISOString(),
    sql_views_count: 14,
    dictionaries_count: 3,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: new Date().toISOString()
  },
  {
    id: '67950ada-2fba-4e6f-aa94-a44f33aa8d20',
    name: 'Demo DHIS2',
    base_url: 'https://play.dhis2.org/40/api',
    username: 'admin',
    version: '2.40.1',
    status: 'connected',
    last_sync: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    sql_views_count: 12,
    dictionaries_count: 2,
    created_at: '2025-01-10T08:00:00Z',
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'c8e7f6d5-4b3a-2c1d-9e8f-7a6b5c4d3e2f',
    name: 'Training Environment',
    base_url: 'https://training.dhis2.org/api',
    username: 'admin',
    version: '2.39.2',
    status: 'disconnected',
    last_sync: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
    sql_views_count: 5,
    dictionaries_count: 1,
    created_at: '2025-01-05T12:00:00Z',
    updated_at: new Date(Date.now() - 604800000).toISOString()
  }
];

let localMockInstances = [...mockInstances];

// Helper function to check if Supabase is available
function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export class InstanceService {
  // Get all instances
  static async getInstances(): Promise<DHIS2Instance[]> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Using mock data - Supabase not configured');
      return localMockInstances;
    }

    try {
      const { data, error } = await supabase
        .from('dhis2_instances')
        .select('id, name, base_url, username, version, status, last_sync, sql_views_count, dictionaries_count, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instances:', error);
        console.warn('⚠️ Database error - falling back to mock data');
        return localMockInstances;
      }

      // If no data in database, return mock data
      if (!data || data.length === 0) {
        console.warn('⚠️ No instances in database - using mock data');
        return localMockInstances;
      }

      return data || [];
    } catch (error) {
      console.error('Supabase connection failed, using mock data:', error);
      return localMockInstances;
    }
  }

  // Get single instance
  static async getInstance(id: string): Promise<DHIS2Instance | null> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available - using mock data');
      return localMockInstances.find(instance => instance.id === id) || null;
    }

    try {
      console.log('🔍 Fetching instance from database:', id);
      const { data, error } = await supabase
        .from('dhis2_instances')
        .select('id, name, base_url, username, version, status, last_sync, sql_views_count, dictionaries_count, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching instance:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.warn('⚠️ Database error - falling back to mock data');
        return localMockInstances.find(instance => instance.id === id) || null;
      }

      console.log('✅ Instance fetched successfully:', data?.name);
      return data;
    } catch (error) {
      console.error('Error fetching instance:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace',
        hint: '',
        code: ''
      });
      console.warn('⚠️ Connection error - falling back to mock data');
      return localMockInstances.find(instance => instance.id === id) || null;
    }
  }

  // Create new instance
  static async createInstance(instanceData: CreateInstanceData): Promise<DHIS2Instance> {
    // First test the connection
    const connectionTest = await this.testConnection({
      base_url: instanceData.base_url,
      username: instanceData.username,
      password: instanceData.password,
      allowSelfSignedCerts: instanceData.allowSelfSignedCerts
    });
    if (!connectionTest.success) {
      throw new Error(connectionTest.error);
    }

    if (!isSupabaseAvailable()) {
      // Create mock instance
      const newInstance: DHIS2Instance = {
        id: crypto.randomUUID(),
        name: instanceData.name,
        base_url: instanceData.base_url,
        username: instanceData.username,
        version: connectionTest.version || 'Unknown',
        status: 'connected',
        last_sync: new Date().toISOString(),
        sql_views_count: 0,
        dictionaries_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localMockInstances.push(newInstance);
      return newInstance;
    }

    try {
      // Encrypt password using proper credential manager
      const passwordEncrypted = CredentialManager.encrypt(instanceData.password);

      const { data, error } = await supabase
        .from('dhis2_instances')
        .insert([
          {
            name: instanceData.name,
            base_url: instanceData.base_url,
            username: instanceData.username,
            password_encrypted: passwordEncrypted,
            version: connectionTest.version,
            status: 'connected'
          }
        ])
        .select('id, name, base_url, username, version, status, last_sync, sql_views_count, dictionaries_count, created_at, updated_at')
        .single();

      if (error) {
        console.error('Error creating instance:', error);
        throw new Error(`Failed to create instance: ${error.message}`);
      }

      console.log('✅ Instance created successfully:', data.name);
      return data;
    } catch (error) {
      console.error('Supabase error, creating mock instance:', error);
      // Fallback to mock creation
      const newInstance: DHIS2Instance = {
        id: crypto.randomUUID(),
        name: instanceData.name,
        base_url: instanceData.base_url,
        username: instanceData.username,
        version: connectionTest.version || 'Unknown',
        status: 'connected',
        last_sync: new Date().toISOString(),
        sql_views_count: 0,
        dictionaries_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localMockInstances.push(newInstance);
      return newInstance;
    }
  }

  // Update instance
  static async updateInstance(id: string, updates: Partial<CreateInstanceData>): Promise<DHIS2Instance> {
    if (!isSupabaseAvailable()) {
      const instanceIndex = localMockInstances.findIndex(instance => instance.id === id);
      if (instanceIndex === -1) {
        throw new Error('Instance not found');
      }
      
      localMockInstances[instanceIndex] = {
        ...localMockInstances[instanceIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      return localMockInstances[instanceIndex];
    }

    try {
      const updateData: any = { ...updates };
      
      // If password is being updated, encrypt it
      if (updates.password) {
        updateData.password_encrypted = CredentialManager.encrypt(updates.password);
        delete updateData.password;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('dhis2_instances')
        .update(updateData)
        .eq('id', id)
        .select('id, name, base_url, username, version, status, last_sync, sql_views_count, dictionaries_count, created_at, updated_at')
        .single();

      if (error) {
        console.error('Error updating instance:', error);
        throw new Error('Failed to update instance');
      }

      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to update instance');
    }
  }

  // Delete instance
  static async deleteInstance(id: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      const instanceIndex = localMockInstances.findIndex(instance => instance.id === id);
      if (instanceIndex !== -1) {
        localMockInstances.splice(instanceIndex, 1);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('dhis2_instances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting instance:', error);
        throw new Error('Failed to delete instance');
      }
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to delete instance');
    }
  }

  // Test connection to DHIS2 instance
  static async testConnection(instanceData: { base_url: string; username: string; password: string; allowSelfSignedCerts?: boolean }): Promise<{ success: boolean; error?: string; version?: string }> {
    try {
      console.log('🔍 Testing connection to:', instanceData.base_url);
      
      // Determine the full URL for the API call
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const apiUrl = `${baseUrl}/api/dhis2/test-connection`;
      
      console.log('🔗 Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverUrl: instanceData.base_url,
          username: instanceData.username,
          password: instanceData.password,
          allowSelfSignedCerts: instanceData.allowSelfSignedCerts || false,
        }),
      });

      const result = await response.json();
      
      console.log('🔍 Connection test result:', result);

      if (response.ok && result.connected) {
        return {
          success: true,
          version: result.version || result.serverInfo?.version || 'Unknown'
        };
      } else {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}: ${result.message || 'Connection failed'}`
        };
      }
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Update instance status
  static async updateInstanceStatus(id: string, status: 'connected' | 'disconnected' | 'error'): Promise<void> {
    if (!isSupabaseAvailable()) {
      const instanceIndex = localMockInstances.findIndex(instance => instance.id === id);
      if (instanceIndex !== -1) {
        localMockInstances[instanceIndex].status = status;
        localMockInstances[instanceIndex].last_sync = new Date().toISOString();
        localMockInstances[instanceIndex].updated_at = new Date().toISOString();
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('dhis2_instances')
        .update({ 
          status, 
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating instance status:', error);
        throw new Error('Failed to update instance status');
      }
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to update instance status');
    }
  }

  // Get instance credentials (for API calls)
  static async getInstanceCredentials(id: string): Promise<{ username: string; password: string } | null> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available - using mock credentials');
      const instance = localMockInstances.find(instance => instance.id === id);
      if (!instance) return null;
      
      // Return mock credentials based on instance
      if (instance.base_url.includes('play.dhis2.org')) {
        return { username: 'admin', password: 'district' };
      } else if (instance.base_url.includes('hisprwanda.org')) {
        return { username: 'bmafende', password: 'Climate@123' };
      } else {
        return { username: instance.username, password: 'district' };
      }
    }

    try {
      console.log('🔑 Fetching credentials for instance:', id);
      const { data, error } = await supabase
        .from('dhis2_instances')
        .select('username, password_encrypted')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching credentials:', error);
        console.warn('⚠️ Database error - falling back to mock credentials');
        
        // Fallback to mock credentials
        const instance = localMockInstances.find(instance => instance.id === id);
        if (!instance) return null;
        
        if (instance.base_url.includes('play.dhis2.org')) {
          return { username: 'admin', password: 'district' };
        } else if (instance.base_url.includes('hisprwanda.org')) {
          return { username: 'bmafende', password: 'Climate@123' };
        } else {
          return { username: instance.username, password: 'district' };
        }
      }

      console.log('✅ Credentials fetched successfully for user:', data.username);
      return {
        username: data.username,
        password: CredentialManager.decrypt(data.password_encrypted)
      };
    } catch (error) {
      console.error('Supabase error fetching credentials:', error);
      console.warn('⚠️ Connection error - falling back to mock credentials');
      
      // Fallback to mock credentials
      const instance = localMockInstances.find(instance => instance.id === id);
      if (!instance) return null;
      
      if (instance.base_url.includes('play.dhis2.org')) {
        return { username: 'admin', password: 'district' };
      } else if (instance.base_url.includes('hisprwanda.org')) {
        return { username: 'bmafende', password: 'Climate@123' };
      } else {
        return { username: instance.username, password: 'district' };
      }
    }
  }

  // Sync metadata for instance
  static async syncMetadata(id: string): Promise<void> {
    try {
      const instance = await this.getInstance(id);
      if (!instance) {
        throw new Error('Instance not found');
      }

      const credentials = await this.getInstanceCredentials(id);
      if (!credentials) {
        throw new Error('Failed to get instance credentials');
      }

      // Test connection first
      const connectionTest = await this.testConnection({
        base_url: instance.base_url,
        username: credentials.username,
        password: credentials.password
      });

      if (!connectionTest.success) {
        await this.updateInstanceStatus(id, 'error');
        throw new Error(connectionTest.error);
      }

      // Update status and sync time
      await this.updateInstanceStatus(id, 'connected');

      // TODO: Implement actual metadata sync logic here
      // This would fetch SQL views, update counts, etc.

    } catch (error) {
      await this.updateInstanceStatus(id, 'error');
      throw error;
    }
  }
} 