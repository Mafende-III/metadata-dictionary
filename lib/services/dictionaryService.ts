import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export interface MetadataDictionary {
  id: string;
  name: string;
  description?: string;
  instance_id: string;
  instance_name: string;
  metadata_type: 'dataElements' | 'indicators' | 'programIndicators' | 'dataElementGroups' | 'indicatorGroups';
  sql_view_id: string;
  group_id?: string;
  processing_method: 'batch' | 'individual';
  period?: string;
  version: string;
  variables_count: number;
  status: 'active' | 'generating' | 'error';
  quality_average: number;
  processing_time?: number;
  success_rate: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DictionaryVariable {
  id: string;
  dictionary_id: string;
  variable_uid: string;
  variable_name: string;
  variable_type: string;
  quality_score: number;
  processing_time?: number;
  status: 'success' | 'error' | 'pending';
  error_message?: string;
  metadata_json?: any;
  analytics_url?: string;
  api_url?: string;
  download_url?: string;
  dhis2_url?: string;
  export_formats?: string[];
  created_at: string;
}

export interface CreateDictionaryData {
  name: string;
  description?: string;
  instance_id: string;
  instance_name: string;
  metadata_type: 'dataElements' | 'indicators' | 'programIndicators' | 'dataElementGroups' | 'indicatorGroups';
  sql_view_id: string;
  group_id?: string;
  processing_method: 'batch' | 'individual';
  period?: string;
}

// Mock data for development when Supabase isn't available
const mockDictionaries: MetadataDictionary[] = [
  {
    id: 'f8e9d5c3-7a2b-4f1e-9c8d-6e5f4a3b2c1d',
    name: 'Q1 2025 Health Data Elements',
    description: 'Complete metadata export with quality scores',
    instance_id: 'a4b7da3f-c1b6-4953-b6e7-42435feb80e6',
    instance_name: 'HMIS Current',
    metadata_type: 'dataElements',
    sql_view_id: 'YN8eFwDcO0r',
    processing_method: 'batch',
    period: 'Q1 2025',
    version: 'v2.1',
    variables_count: 1247,
    status: 'active',
    quality_average: 85.6,
    processing_time: 120,
    success_rate: 98.2,
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T14:30:00Z'
  },
  {
    id: '8b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
    name: 'Annual Indicators Assessment',
    description: 'All program indicators with formulas',
    instance_id: '67950ada-2fba-4e6f-aa94-a44f33aa8d20',
    instance_name: 'Demo DHIS2',
    metadata_type: 'indicators',
    sql_view_id: 'IND456ABC',
    processing_method: 'individual',
    period: '2024',
    version: 'v1.3',
    variables_count: 342,
    status: 'active',
    quality_average: 92.1,
    processing_time: 75,
    success_rate: 99.1,
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-18T16:45:00Z'
  },
  {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Category Combinations Master List',
    description: 'All disaggregations and category options',
    instance_id: 'a4b7da3f-c1b6-4953-b6e7-42435feb80e6',
    instance_name: 'HMIS Current',
    metadata_type: 'dataElementGroups',
    sql_view_id: 'CAT789XYZ',
    processing_method: 'batch',
    period: '2025',
    version: 'v1.0',
    variables_count: 156,
    status: 'active',
    quality_average: 78.4,
    processing_time: 45,
    success_rate: 96.8,
    created_at: '2025-01-10T12:00:00Z',
    updated_at: '2025-01-12T09:15:00Z'
  },
  {
    id: '5d67cdc7-b6e3-4f61-afde-170d3c44505b',
    name: 'Immunization Data Elements',
    description: 'Currently being generated with group filtering',
    instance_id: 'a4b7da3f-c1b6-4953-b6e7-42435feb80e6',
    instance_name: 'HMIS Current',
    metadata_type: 'dataElements',
    sql_view_id: 'IMM123ABC',
    group_id: 'de-group-1',
    processing_method: 'individual',
    period: 'Q1 2025',
    version: 'v1.0',
    variables_count: 89,
    status: 'generating',
    quality_average: 0,
    processing_time: 0,
    success_rate: 0,
    created_at: '2025-01-21T11:00:00Z',
    updated_at: '2025-01-21T11:00:00Z'
  }
];

let localMockDictionaries = [...mockDictionaries];

// Helper function to check if Supabase is available
function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export class DictionaryService {
  // Get all dictionaries
  static async getDictionaries(): Promise<MetadataDictionary[]> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Using mock data - Supabase not configured');
      return localMockDictionaries;
    }

    try {
      const { data, error } = await supabase
        .from('metadata_dictionaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dictionaries:', error);
        console.warn('Falling back to mock data');
        return localMockDictionaries;
      }

      return data || [];
    } catch (error) {
      console.error('Supabase connection failed, using mock data:', error);
      return localMockDictionaries;
    }
  }

  // Get single dictionary
  static async getDictionary(id: string): Promise<MetadataDictionary | null> {
    if (!isSupabaseAvailable()) {
      return localMockDictionaries.find(dict => dict.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('metadata_dictionaries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching dictionary:', error);
        return localMockDictionaries.find(dict => dict.id === id) || null;
      }

      return data;
    } catch (error) {
      console.error('Supabase connection failed, using mock data:', error);
      return localMockDictionaries.find(dict => dict.id === id) || null;
    }
  }

  // Create new dictionary
  static async createDictionary(dictionaryData: CreateDictionaryData): Promise<MetadataDictionary> {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, creating mock dictionary');
      // Create mock dictionary
      const newDictionary: MetadataDictionary = {
        id: crypto.randomUUID(),
        ...dictionaryData,
        version: 'v1.0',
        variables_count: 0,
        status: 'generating',
        quality_average: 0,
        processing_time: 0,
        success_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localMockDictionaries.unshift(newDictionary);
      return newDictionary;
    }

    try {
      console.log('📝 Creating dictionary in database:', dictionaryData.name);
      
      const { data, error } = await supabase
        .from('metadata_dictionaries')
        .insert([
          {
            ...dictionaryData,
            status: 'generating'
          }
        ])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error creating dictionary:', error);
        throw new Error(`Failed to create dictionary in database: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from dictionary creation');
      }

      console.log('✅ Dictionary created successfully in database:', data.id);

      // Try to update instance dictionary count (non-critical)
      try {
        await supabase.rpc('update_instance_stats', { p_instance_id: dictionaryData.instance_id });
      } catch (statsError) {
        console.warn('⚠️ Failed to update instance stats:', statsError);
        // Don't fail the whole operation for stats update
      }

      return data;
    } catch (error) {
      console.error('❌ Fatal error creating dictionary:', error);
      // DO NOT fall back to mock when Supabase is available but fails
      // This prevents foreign key constraint violations
      throw new Error(`Dictionary creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update dictionary
  static async updateDictionary(id: string, updates: Partial<MetadataDictionary>): Promise<MetadataDictionary> {
    if (!isSupabaseAvailable()) {
      const dictIndex = localMockDictionaries.findIndex(dict => dict.id === id);
      if (dictIndex === -1) {
        throw new Error('Dictionary not found');
      }
      
      localMockDictionaries[dictIndex] = {
        ...localMockDictionaries[dictIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      return localMockDictionaries[dictIndex];
    }

    try {
      const { data, error } = await supabase
        .from('metadata_dictionaries')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating dictionary:', error);
        throw new Error('Failed to update dictionary');
      }

      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to update dictionary');
    }
  }

  // Delete dictionary
  static async deleteDictionary(id: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      const dictIndex = localMockDictionaries.findIndex(dict => dict.id === id);
      if (dictIndex !== -1) {
        localMockDictionaries.splice(dictIndex, 1);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('metadata_dictionaries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting dictionary:', error);
        throw new Error('Failed to delete dictionary');
      }
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to delete dictionary');
    }
  }

  // Get dictionary variables
  static async getDictionaryVariables(dictionaryId: string): Promise<DictionaryVariable[]> {
    if (!isSupabaseAvailable()) {
      // Return mock variables for the dictionary
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('dictionary_variables')
        .select('*')
        .eq('dictionary_id', dictionaryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dictionary variables:', error);
        throw new Error('Failed to fetch dictionary variables');
      }

      return data || [];
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to fetch dictionary variables');
    }
  }

  // Add variable to dictionary
  static async addVariable(variable: Omit<DictionaryVariable, 'id' | 'created_at'>): Promise<DictionaryVariable> {
    if (!isSupabaseAvailable()) {
      const newVariable: DictionaryVariable = {
        id: crypto.randomUUID(),
        ...variable,
        created_at: new Date().toISOString()
      };
      return newVariable;
    }

    try {
      console.log(`📝 Adding variable ${variable.variable_name} to dictionary ${variable.dictionary_id}`);
      
      const { data, error } = await supabase
        .from('dictionary_variables')
        .insert([variable])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error adding variable:', error);
        throw new Error(`Failed to add variable to database: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from variable creation');
      }

      console.log(`✅ Variable added successfully: ${data.variable_name}`);

      // Try to update dictionary statistics (non-critical)
      try {
        await supabase.rpc('update_dictionary_stats', { p_dictionary_id: variable.dictionary_id });
      } catch (statsError) {
        console.warn('⚠️ Failed to update dictionary stats:', statsError);
        // Don't fail the whole operation for stats update
      }

      return data;
    } catch (error) {
      console.error('❌ Fatal error adding variable:', error);
      throw new Error(`Variable creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Enhanced method to create variable with comprehensive API URLs
  static async createVariableWithApiUrls(
    variableData: Omit<DictionaryVariable, 'id' | 'created_at' | 'api_url' | 'download_url' | 'dhis2_url' | 'export_formats'>,
    instanceBaseUrl: string,
    instanceId: string
  ): Promise<DictionaryVariable> {
    const uid = variableData.variable_uid;
    const metadataType = variableData.variable_type;
    
    // Generate comprehensive API URLs
    const apiUrls = {
      api_url: `${instanceBaseUrl}/${metadataType}/${uid}.json`,
      download_url: `${instanceBaseUrl}/${metadataType}/${uid}.json?download=true`,
      dhis2_url: `${instanceBaseUrl.replace('/api', '')}/#/maintenance/${metadataType}/${uid}`,
      analytics_url: variableData.analytics_url || `${instanceBaseUrl}/analytics?dimension=${uid}&pe=THIS_YEAR&ou=USER_ORGUNIT`,
      export_formats: ['json', 'xml', 'csv', 'pdf']
    };

    const enhancedVariable = {
      ...variableData,
      ...apiUrls
    };

    return await this.addVariable(enhancedVariable);
  }

  // Update variable
  static async updateVariable(id: string, updates: Partial<DictionaryVariable>): Promise<DictionaryVariable> {
    if (!isSupabaseAvailable()) {
      // Mock update
      return {
        id,
        ...updates,
        created_at: new Date().toISOString()
      } as DictionaryVariable;
    }

    try {
      const { data, error } = await supabase
        .from('dictionary_variables')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating variable:', error);
        throw new Error('Failed to update variable');
      }

      return data;
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to update variable');
    }
  }

  // Update dictionary status
  static async updateStatus(id: string, status: 'active' | 'generating' | 'error', errorMessage?: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      const dictIndex = localMockDictionaries.findIndex(dict => dict.id === id);
      if (dictIndex !== -1) {
        localMockDictionaries[dictIndex].status = status;
        localMockDictionaries[dictIndex].updated_at = new Date().toISOString();
        if (errorMessage) {
          localMockDictionaries[dictIndex].error_message = errorMessage;
        }
      }
      return;
    }

    try {
      const updates: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('metadata_dictionaries')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating dictionary status:', error);
        throw new Error('Failed to update dictionary status');
      }
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to update dictionary status');
    }
  }

  // Get dictionaries by instance
  static async getDictionariesByInstance(instanceId: string): Promise<MetadataDictionary[]> {
    if (!isSupabaseAvailable()) {
      return localMockDictionaries.filter(dict => dict.instance_id === instanceId);
    }

    try {
      const { data, error } = await supabase
        .from('metadata_dictionaries')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dictionaries by instance:', error);
        throw new Error('Failed to fetch dictionaries');
      }

      return data || [];
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to fetch dictionaries');
    }
  }

  // Get dictionary statistics
  static async getDictionaryStats(): Promise<{
    total: number;
    active: number;
    generating: number;
    totalVariables: number;
    instances: number;
  }> {
    if (!isSupabaseAvailable()) {
      const total = localMockDictionaries.length;
      const active = localMockDictionaries.filter(d => d.status === 'active').length;
      const generating = localMockDictionaries.filter(d => d.status === 'generating').length;
      const totalVariables = localMockDictionaries.reduce((sum, d) => sum + d.variables_count, 0);
      const instances = [...new Set(localMockDictionaries.map(d => d.instance_id))].length;

      return {
        total,
        active,
        generating,
        totalVariables,
        instances
      };
    }

    try {
      const { data: dictionaries, error: dictError } = await supabase
        .from('metadata_dictionaries')
        .select('status, variables_count, instance_id');

      if (dictError) {
        console.error('Error fetching dictionary stats:', dictError);
        throw new Error('Failed to fetch dictionary statistics');
      }

      const { data: instances, error: instError } = await supabase
        .from('dhis2_instances')
        .select('id');

      if (instError) {
        console.error('Error fetching instance count:', instError);
        throw new Error('Failed to fetch instance count');
      }

      const total = dictionaries?.length || 0;
      const active = dictionaries?.filter((d: any) => d.status === 'active').length || 0;
      const generating = dictionaries?.filter((d: any) => d.status === 'generating').length || 0;
      const totalVariables = dictionaries?.reduce((sum: number, d: any) => sum + (d.variables_count || 0), 0) || 0;
      const instanceCount = instances?.length || 0;

      return {
        total,
        active,
        generating,
        totalVariables,
        instances: instanceCount
      };
    } catch (error) {
      console.error('Supabase error:', error);
      throw new Error('Failed to fetch dictionary statistics');
    }
  }

  // Generate dictionary version
  static async generateNewVersion(dictionaryId: string): Promise<MetadataDictionary> {
    const dictionary = await this.getDictionary(dictionaryId);
    if (!dictionary) {
      throw new Error('Dictionary not found');
    }

    // Parse current version and increment
    const currentVersion = dictionary.version || 'v1.0';
    const versionMatch = currentVersion.match(/v(\d+)\.(\d+)/);
    let newVersion = 'v1.1';
    
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      newVersion = `v${major}.${minor + 1}`;
    }

    // Update dictionary with new version and set to generating
    return await this.updateDictionary(dictionaryId, {
      version: newVersion,
      status: 'generating',
      updated_at: new Date().toISOString()
    });
  }
} 