'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Calendar,
  Target,
  BarChart3,
  Table,
  Eye,
  ExternalLink,
  Copy,
  Play,
  Search,
  Download as DownloadIcon,
  Code
} from 'lucide-react';

interface Dictionary {
  id: string;
  name: string;
  description: string;
  instance_name: string;
  metadata_type: string;
  sql_view_id: string;
  group_id?: string;
  processing_method: string;
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
  data?: {
    detected_columns?: string[];
    column_metadata?: any;
    preview_structure?: any;
  };
}

interface DictionaryVariable {
  id: string;
  variable_uid: string;
  variable_name: string;
  variable_type: string;
  quality_score: number;
  status: 'success' | 'error' | 'pending';
  error_message?: string;
  metadata_json?: any;
  original_sql_data?: any; // Original SQL view JSON response
  analytics_api?: string; // Clean analytics API URL
  metadata_api?: string; // Clean metadata API URL
  data_values_api?: string; // Clean data values API URL (dataElements only)
  export_api?: string; // Clean export API URL
  web_ui_url?: string; // DHIS2 web UI URL
  // Enhanced action tracking fields
  action?: 'imported' | 'created' | 'updated' | 'deprecated' | 'replaced' | 'merged';
  group_id?: string;
  group_name?: string;
  parent_group_id?: string;
  parent_group_name?: string;
  action_timestamp?: string;
  action_details?: any;
  // Legacy fields for compatibility
  analytics_url?: string;
  api_url?: string;
  download_url?: string;
  dhis2_url?: string;
  export_formats?: string[];
  created_at: string;
}

interface AnalyticsData {
  headers: any[];
  rows: any[][];
  metaData: any;
  height: number;
  width: number;
}

export default function DictionaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [variables, setVariables] = useState<DictionaryVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [variablesLoading, setVariablesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'variables' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [analyticsData, setAnalyticsData] = useState<Record<string, AnalyticsData>>({});
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);

  // Analytics controls state
  const [analyticsControls, setAnalyticsControls] = useState({
    selectedVariablesForAnalytics: [] as string[],
    selectedPeriod: 'THIS_YEAR',
    selectedOrgUnit: 'USER_ORGUNIT',
    visualizationType: 'table' as 'table' | 'bar' | 'line' | 'pivot'
  });
  const [fetchingAnalytics, setFetchingAnalytics] = useState(false);
  const [orgUnits, setOrgUnits] = useState<Array<{id: string, name: string}>>([]);
  const [periods, setPeriods] = useState<Array<{id: string, name: string}>>([]);

  const dictionaryId = params.id as string;

  // Fetch dictionary data
  const fetchDictionary = async () => {
    try {
      const response = await fetch(`/api/dictionaries/${dictionaryId}`);
      const result = await response.json();

      if (result.success) {
        setDictionary(result.data);
        setError(null);
        
        // If status is generating, set up auto-refresh
        if (result.data.status === 'generating') {
          if (!refreshInterval) {
            const interval = setInterval(fetchDictionary, 5000);
            setRefreshInterval(interval);
          }
        } else {
          // Clear refresh if not generating
          if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
          }
        }
      } else {
        setError(result.error || 'Failed to fetch dictionary');
      }
    } catch (err) {
      setError('Failed to load dictionary data');
      console.error('Error fetching dictionary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dictionary variables
  const fetchVariables = async () => {
    if (!dictionary || dictionary.status !== 'active') return;
    
    setVariablesLoading(true);
    try {
      const response = await fetch(`/api/dictionaries/${dictionaryId}/variables`);
      const result = await response.json();

      if (result.success) {
        setVariables(result.data || []);
      } else {
        console.error('Failed to fetch variables:', result.error);
      }
    } catch (err) {
      console.error('Error fetching variables:', err);
    } finally {
      setVariablesLoading(false);
    }
  };

  // Fetch analytics data for a variable
  const fetchAnalyticsData = async (variableUid: string) => {
    try {
      const response = await fetch(`/api/dictionaries/${dictionaryId}/analytics/${variableUid}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(prev => ({
          ...prev,
          [variableUid]: result.data
        }));
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    }
  };

  // Export individual variable with complete previewed table structure
  const exportVariableData = (variableUid: string, format: string = 'json') => {
    const variable = variables.find(v => v.variable_uid === variableUid);
    if (!variable) {
      alert('Variable not found in current table');
      return;
    }

    // Get the complete table structure from metadata_json
    const completeTableRow = variable.metadata_json || {};
    const detectedColumns = dictionary?.data?.detected_columns || [];

    // Use the properly generated API URLs from the variable
    const apiEndpoints: any = {
      analytics: variable.analytics_api || variable.analytics_url,
      metadata: variable.metadata_api || variable.api_url,
      export_url: variable.export_api || variable.download_url,
      dhis2_web: variable.web_ui_url || variable.dhis2_url,
      data_values: variable.data_values_api // The key enhancement!
    };

    const exportData = {
      variable: {
        uid: variable.variable_uid,
        name: variable.variable_name,
        type: variable.variable_type,
        quality_score: variable.quality_score,
        status: variable.status,
        created_at: variable.created_at,
        supports_raw_data: !!variable.data_values_api
      },
      // Complete previewed table structure
      complete_table_row: completeTableRow,
      detected_columns: detectedColumns,
      table_structure: {
        source: 'sql_view_preview',
        columns_count: detectedColumns.length,
        dynamic_structure: true
      },
      api_endpoints: apiEndpoints,
      api_usage_guide: {
        analytics: "Use for aggregated data analysis and visualizations",
        metadata: "Use to get detailed metadata and configuration",
        data_values: variable.data_values_api ? "Use to get raw data values - specific to this variable" : undefined,
        dhis2_web: "Open in DHIS2 web interface for editing"
      },
      dictionary: {
        id: dictionary?.id,
        name: dictionary?.name,
        instance: dictionary?.instance_name,
        table_source: 'sql_view_preview'
      },
      export_info: {
        exported_at: new Date().toISOString(),
        format: format,
        source: 'dynamic_table_structure',
        api_url_service: 'Enhanced_v2.0'
      }
    };

    let content, mimeType, extension;
    
    switch (format) {
      case 'csv':
                 // Include all dynamic columns in CSV
         const csvHeaders = ['Variable_UID', 'Variable_Name', 'Type', 'Quality_Score', 'Status', ...detectedColumns, 'Data_Values_API', 'Analytics_API'];
         const csvValues = [
           variable.variable_uid,
           `"${variable.variable_name}"`,
           variable.variable_type,
           variable.quality_score,
           variable.status,
           ...detectedColumns.map(col => `"${String((completeTableRow as any)?.[col] || '')}"`),
           `"${variable.data_values_api || ''}"`,
           `"${exportData.api_endpoints.analytics || ''}"`
         ];
         content = csvHeaders.join(',') + '\n' + csvValues.join(',');
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
      default:
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    // Trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${variable.variable_name.replace(/[^a-zA-Z0-9]/g, '_')}_complete_table_${variable.variable_uid}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export combined variables with complete previewed table structure
  const exportCombinedData = (format: string = 'json') => {
    if (!dictionary) {
      alert('Dictionary not loaded');
      return;
    }

    const variablesToExport = selectedVariables.length > 0 
      ? variables.filter(v => selectedVariables.includes(v.variable_uid))
      : variables; // Export all if none selected

    if (variablesToExport.length === 0) {
      alert('No variables available to export');
      return;
    }

    // Get the dynamic columns from the dictionary or first variable
    const sampleVariable = variablesToExport[0];
    const dynamicColumns = sampleVariable?.metadata_json ? Object.keys(sampleVariable.metadata_json) : [];
    const detectedColumns = dictionary.data?.detected_columns || dynamicColumns;

    const baseUrl = dictionary.instance_name.includes('HMIS') 
      ? 'https://online.hisprwanda.org/hmis/api' 
      : 'https://play.dhis2.org/40/api';

    const exportData = {
      dictionary: {
        id: dictionary.id,
        name: dictionary.name,
        description: dictionary.description,
        instance: dictionary.instance_name,
        metadata_type: dictionary.metadata_type,
        period: dictionary.period,
        version: dictionary.version,
        status: dictionary.status,
        variables_count: variablesToExport.length,
        quality_average: dictionary.quality_average,
        table_structure: {
          source: 'sql_view_preview',
          detected_columns: detectedColumns,
          dynamic_structure: true
        }
      },
      variables: variablesToExport.map(variable => {
        const completeTableRow = variable.metadata_json || {};
        return {
          uid: variable.variable_uid,
          name: variable.variable_name,
          type: variable.variable_type,
          quality_score: variable.quality_score,
          status: variable.status,
          created_at: variable.created_at,
          // Complete table row from original preview
          complete_table_row: completeTableRow,
          api_endpoints: {
            analytics: variable.analytics_api || `${baseUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT`,
            metadata: variable.metadata_api || `${baseUrl}/${variable.variable_type}/${variable.variable_uid}.json`,
            data_values: variable.data_values_api || `${baseUrl}/dataValueSets?dataElement=${variable.variable_uid}&period=THIS_YEAR&orgUnit=USER_ORGUNIT`
          }
        };
      }),
      table_export: {
        detected_columns: detectedColumns,
        complete_table_data: variablesToExport.map(variable => variable.metadata_json || {}),
        structure_type: 'dynamic_from_sql_view'
      },
      bulk_api_endpoints: {
        bulk_analytics: `${baseUrl}/analytics?dimension=dx:${variablesToExport.map(v => v.variable_uid).join(';')}&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT`,
        bulk_metadata: `${baseUrl}/metadata?filter=id:in:[${variablesToExport.map(v => v.variable_uid).join(',')}]&fields=:all`
      },
      export_info: {
        exported_at: new Date().toISOString(),
        format: format,
        source: 'dynamic_table_structure',
        total_variables: variablesToExport.length,
        selected_variables: selectedVariables.length,
        includes_complete_table: true
      }
    };

    let content, mimeType, extension;
    
    switch (format) {
      case 'csv':
        // Include all dynamic columns in CSV export
        const csvHeaders = ['Variable_UID', 'Variable_Name', 'Type', 'Quality_Score', 'Status', ...detectedColumns, 'Data_Values_API', 'Analytics_API'];
        let csvContent = csvHeaders.join(',') + '\n';
        
        csvContent += variablesToExport.map(variable => {
          const completeTableRow = variable.metadata_json || {};
          const csvValues = [
            variable.variable_uid,
            `"${variable.variable_name}"`,
            variable.variable_type,
            variable.quality_score,
            variable.status,
            ...detectedColumns.map(col => `"${String((completeTableRow as any)[col] || '')}"`),
            `"${variable.data_values_api || ''}"`,
            `"${variable.analytics_api || ''}"`
          ];
          return csvValues.join(',');
        }).join('\n');
        
        content = csvContent;
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
      default:
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    // Trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dictionary.name.replace(/[^a-zA-Z0-9]/g, '_')}_complete_table_${variablesToExport.length}_variables.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate curl command for variable
  const generateCurlCommand = (variable: DictionaryVariable) => {
    const baseUrl = dictionary?.instance_name.includes('HMIS') 
      ? 'https://online.hisprwanda.org/hmis/api' 
      : 'https://play.dhis2.org/40/api';
    
    return `curl -X GET "${baseUrl}/analytics?dimension=dx:${variable.variable_uid}&dimension=pe:THIS_YEAR&dimension=ou:USER_ORGUNIT" \\
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  -H "Content-Type: application/json"`;
  };

  // Copy curl command to clipboard
  const copyCurlCommand = (variable: DictionaryVariable) => {
    const curlCommand = generateCurlCommand(variable);
    navigator.clipboard.writeText(curlCommand);
    alert('Curl command copied to clipboard!');
  };

  // Fetch organization units from DHIS2 instance
  const fetchOrgUnits = async () => {
    try {
      const baseUrl = dictionary.instance_name.includes('HMIS') 
        ? 'https://online.hisprwanda.org/hmis/api' 
        : 'https://play.dhis2.org/40/api';
      
      // For now, provide common org unit options
      // In production, this would fetch from the actual DHIS2 instance
      setOrgUnits([
        { id: 'USER_ORGUNIT', name: 'User Organisation Unit' },
        { id: 'LEVEL-1', name: 'National Level' },
        { id: 'LEVEL-2', name: 'Provincial Level' },
        { id: 'LEVEL-3', name: 'District Level' },
        { id: 'LEVEL-4', name: 'Facility Level' }
      ]);
    } catch (err) {
      console.error('Error fetching org units:', err);
      setOrgUnits([{ id: 'USER_ORGUNIT', name: 'User Organisation Unit' }]);
    }
  };

  // Fetch periods
  const fetchPeriods = async () => {
    const currentYear = new Date().getFullYear();
    setPeriods([
      { id: 'THIS_YEAR', name: 'This Year' },
      { id: 'LAST_YEAR', name: 'Last Year' },
      { id: 'LAST_12_MONTHS', name: 'Last 12 Months' },
      { id: 'LAST_3_MONTHS', name: 'Last 3 Months' },
      { id: `${currentYear}Q1`, name: `${currentYear} Q1` },
      { id: `${currentYear}Q2`, name: `${currentYear} Q2` },
      { id: `${currentYear}Q3`, name: `${currentYear} Q3` },
      { id: `${currentYear}Q4`, name: `${currentYear} Q4` },
      { id: `${currentYear-1}`, name: `${currentYear-1}` },
      { id: `${currentYear}`, name: `${currentYear}` }
    ]);
  };

  // Fetch analytics data for selected variables
  const fetchAnalyticsForVariables = async () => {
    if (analyticsControls.selectedVariablesForAnalytics.length === 0) {
      alert('Please select variables for analytics');
      return;
    }

    setFetchingAnalytics(true);
    
    try {
      const variableUids = analyticsControls.selectedVariablesForAnalytics.join(';');
      
      // Fetch combined analytics data using the bulk endpoint
      const response = await fetch(`/api/dictionaries/${dictionaryId}/export/combined`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: analyticsControls.selectedVariablesForAnalytics,
          format: 'json',
          period: analyticsControls.selectedPeriod,
          orgUnit: analyticsControls.selectedOrgUnit
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Transform the export data into analytics format
        const analyticsData = {
          headers: [
            { name: 'dx', column: 'Data', valueType: 'TEXT' },
            { name: 'pe', column: 'Period', valueType: 'TEXT' },
            { name: 'ou', column: 'Organisation unit', valueType: 'TEXT' },
            { name: 'value', column: 'Value', valueType: 'NUMBER' }
          ],
          metaData: {
            dx: {},
            pe: {},
            ou: {},
            dimensions: {
              dx: analyticsControls.selectedVariablesForAnalytics,
              pe: [analyticsControls.selectedPeriod],
              ou: [analyticsControls.selectedOrgUnit]
            }
          },
          rows: [],
          height: 0,
          width: 4
        };

        // Add metadata for selected variables
        result.data.variables.forEach((variable: any) => {
          analyticsData.metaData.dx[variable.uid] = { name: variable.name };
        });

        // Add period metadata
        const selectedPeriodObj = periods.find(p => p.id === analyticsControls.selectedPeriod);
        if (selectedPeriodObj) {
          analyticsData.metaData.pe[analyticsControls.selectedPeriod] = { name: selectedPeriodObj.name };
        }

        // Add org unit metadata
        const selectedOrgUnitObj = orgUnits.find(ou => ou.id === analyticsControls.selectedOrgUnit);
        if (selectedOrgUnitObj) {
          analyticsData.metaData.ou[analyticsControls.selectedOrgUnit] = { name: selectedOrgUnitObj.name };
        }

        // Transform variable analytics data into rows
        result.data.variables.forEach((variable: any) => {
          if (variable.analytics && variable.analytics.rows) {
            variable.analytics.rows.forEach((row: any[]) => {
              analyticsData.rows.push([
                variable.uid,
                row[1] || analyticsControls.selectedPeriod,
                row[2] || analyticsControls.selectedOrgUnit,
                row[3] || '0'
              ]);
            });
          } else {
            // Add a row with no data
            analyticsData.rows.push([
              variable.uid,
              analyticsControls.selectedPeriod,
              analyticsControls.selectedOrgUnit,
              '0'
            ]);
          }
        });

        analyticsData.height = analyticsData.rows.length;

        // Store the fetched data
        setAnalyticsData({ combined: analyticsData });

        console.log(`✅ Analytics fetched successfully: ${analyticsData.rows.length} data points`);
        
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      alert(`Error fetching analytics data: ${err instanceof Error ? err.message : 'Please check your connection and authentication.'}`);
    } finally {
      setFetchingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchDictionary();
    
    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [dictionaryId]);

  useEffect(() => {
    if (dictionary && dictionary.status === 'active') {
      fetchVariables();
      fetchOrgUnits();
      fetchPeriods();
    }
  }, [dictionary]);

  // Filter variables based on search term
  const filteredVariables = variables.filter(variable =>
    variable.variable_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.variable_uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-100',
          text: 'Active'
        };
      case 'generating':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          text: 'Generating...'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-100',
          text: 'Error'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dictionary...</p>
        </div>
      </div>
    );
  }

  if (error || !dictionary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Dictionary</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(dictionary.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dictionaries
              </button>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-2xl font-bold text-gray-800">{dictionary.name}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusDisplay.bg}`}>
                <statusDisplay.icon className={`w-4 h-4 ${statusDisplay.color} ${
                  dictionary.status === 'generating' ? 'animate-spin' : ''
                }`} />
                <span className={`text-sm font-medium ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>
              
              {/* Actions */}
              {dictionary.status === 'active' && (
                <>
                  <button 
                    onClick={() => exportCombinedData('json')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export All</span>
                  </button>
                  
                  <button 
                    onClick={() => exportCombinedData('csv')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={fetchDictionary}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          {dictionary.status === 'active' && (
            <div className="flex space-x-8 mt-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 border-b-2 font-medium ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Overview</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('variables')}
                className={`pb-2 border-b-2 font-medium ${
                  activeTab === 'variables'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4" />
                  <span>Variables ({variables.length})</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-2 border-b-2 font-medium ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Generating Status Alert */}
        {dictionary.status === 'generating' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">Dictionary Generation in Progress</h3>
                <p className="text-blue-700 text-sm mt-1">
                  This dictionary is currently being generated. The page will automatically refresh 
                  every 5 seconds to show the latest status.
                </p>
                {refreshInterval && (
                  <p className="text-blue-600 text-xs mt-2">
                    ⏱️ Auto-refreshing every 5 seconds...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Status Alert */}
        {dictionary.status === 'error' && dictionary.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Generation Error</h3>
                <p className="text-red-700 text-sm mt-1">{dictionary.error_message}</p>
              </div>
            </div>
          </div>
        )}

                          {/* Tab Content */}
         {activeTab === 'overview' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main Info */}
             <div className="lg:col-span-2">
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                 <h2 className="text-lg font-semibold text-gray-800 mb-4">Dictionary Information</h2>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-gray-600">Description</label>
                     <p className="text-gray-800 mt-1">{dictionary.description || 'No description provided'}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium text-gray-600">Instance</label>
                       <p className="text-gray-800 mt-1">{dictionary.instance_name}</p>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-600">Metadata Type</label>
                       <p className="text-gray-800 mt-1 capitalize">{dictionary.metadata_type}</p>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium text-gray-600">Processing Method</label>
                       <p className="text-gray-800 mt-1 capitalize">{dictionary.processing_method}</p>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-600">Version</label>
                       <p className="text-gray-800 mt-1">{dictionary.version}</p>
                     </div>
                   </div>
                   
                   {dictionary.period && (
                     <div>
                       <label className="text-sm font-medium text-gray-600">Period</label>
                       <p className="text-gray-800 mt-1">{dictionary.period}</p>
                     </div>
                   )}
                 </div>
               </div>
             </div>

             {/* Statistics */}
             <div className="space-y-6">
               {/* Quick Stats */}
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
                 
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <FileText className="w-4 h-4 text-gray-600" />
                       <span className="text-sm text-gray-600">Variables</span>
                     </div>
                     <span className="font-medium text-gray-800">{dictionary.variables_count}</span>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <BarChart3 className="w-4 h-4 text-gray-600" />
                       <span className="text-sm text-gray-600">Quality Score</span>
                     </div>
                     <span className="font-medium text-gray-800">{dictionary.quality_average.toFixed(1)}</span>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Target className="w-4 h-4 text-gray-600" />
                       <span className="text-sm text-gray-600">Success Rate</span>
                     </div>
                     <span className="font-medium text-gray-800">{dictionary.success_rate.toFixed(1)}%</span>
                   </div>
                   
                   {dictionary.processing_time && (
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                         <Clock className="w-4 h-4 text-gray-600" />
                         <span className="text-sm text-gray-600">Processing Time</span>
                       </div>
                       <span className="font-medium text-gray-800">{dictionary.processing_time}s</span>
                     </div>
                   )}
                 </div>
               </div>

               {/* Timestamps */}
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Timeline</h3>
                 
                 <div className="space-y-3">
                   <div>
                     <div className="flex items-center space-x-2 mb-1">
                       <Calendar className="w-4 h-4 text-gray-600" />
                       <span className="text-sm font-medium text-gray-600">Created</span>
                     </div>
                     <p className="text-sm text-gray-800 ml-6">
                       {new Date(dictionary.created_at).toLocaleString()}
                     </p>
                   </div>
                   
                   <div>
                     <div className="flex items-center space-x-2 mb-1">
                       <RefreshCw className="w-4 h-4 text-gray-600" />
                       <span className="text-sm font-medium text-gray-600">Last Updated</span>
                     </div>
                     <p className="text-sm text-gray-800 ml-6">
                       {new Date(dictionary.updated_at).toLocaleString()}
                     </p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {activeTab === 'variables' && dictionary.status === 'active' && (
          <div className="space-y-6">
            {/* Variables Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Dictionary Variables</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      ✨ Enhanced with Action Tracking
                    </span>
                    <span className="text-xs text-gray-500">
                      Shows: DATA_ELEMENT_ID | DATA_ELEMENT_NAME | GROUP_ID | GROUP_NAME | ACTION
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {selectedVariables.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedVariables.length} selected
                      </span>
                      <button
                        onClick={() => exportCombinedData('json')}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Export Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search variables by name or UID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setSelectedVariables([])}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Clear Selection
                </button>
              </div>

              {/* Dynamic Variables Table - Same structure as preview */}
              {variablesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading variables...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVariables(filteredVariables.map(v => v.variable_uid));
                              } else {
                                setSelectedVariables([]);
                              }
                            }}
                            checked={selectedVariables.length === filteredVariables.length}
                          />
                        </th>
                        {/* Dynamic columns based on the preview table structure */}
                        {(() => {
                          // Get the columns from the first variable's metadata_json (the original table row)
                          const sampleVariable = filteredVariables[0];
                          const dynamicColumns = sampleVariable?.metadata_json ? Object.keys(sampleVariable.metadata_json) : [];
                          
                          // If we have dictionary data with stored columns, use those
                          const storedColumns = dictionary?.data?.detected_columns || dynamicColumns;
                          
                          return storedColumns.map((column: string, index: number) => (
                            <th key={index} className="border border-gray-200 px-4 py-2 text-left">
                              <div className="font-semibold text-gray-900">{column}</div>
                              <div className="text-xs text-gray-500">From SQL View</div>
                            </th>
                          ));
                        })()}
                        <th className="border border-gray-200 px-4 py-2 text-left">Quality</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Data Value API</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVariables.map((variable) => {
                        // Get the dynamic columns from the dictionary or from the first variable
                        const metadata = variable.metadata_json || {};
                        const sampleVariable = filteredVariables[0];
                        const dynamicColumns = sampleVariable?.metadata_json ? Object.keys(sampleVariable.metadata_json) : [];
                        const storedColumns = dictionary?.data?.detected_columns || dynamicColumns;
                        
                        return (
                          <tr key={variable.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedVariables.includes(variable.variable_uid)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVariables([...selectedVariables, variable.variable_uid]);
                                  } else {
                                    setSelectedVariables(selectedVariables.filter(uid => uid !== variable.variable_uid));
                                  }
                                }}
                              />
                            </td>
                            
                            {/* Dynamic columns - render the same structure as the preview */}
                            {storedColumns.map((column: string, colIndex: number) => (
                              <td key={colIndex} className="border border-gray-200 px-4 py-2">
                                <div className="max-w-xs">
                                  {(() => {
                                    const value = (metadata as any)[column];
                                    
                                    // Special styling for UIDs (11 character alphanumeric strings)
                                    if (typeof value === 'string' && value.length === 11 && /^[a-zA-Z0-9]{11}$/.test(value)) {
                                      return (
                                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                          {value}
                                        </code>
                                      );
                                    }
                                    
                                    // Regular text content
                                    return (
                                      <div className="text-sm" title={String(value || '')}>
                                        <div className="truncate">
                                          {String(value || '')}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            ))}
                            
                            {/* Quality Score */}
                            <td className="border border-gray-200 px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                variable.quality_score >= 80 ? 'bg-green-100 text-green-800' :
                                variable.quality_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {variable.quality_score}%
                              </span>
                            </td>
                            
                            {/* Data Value API */}
                            <td className="border border-gray-200 px-4 py-2">
                              <div className="space-y-1">
                                {/* Data Value API Button - The key feature */}
                                {variable.data_values_api && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(variable.data_values_api || '');
                                      alert('Data Value API URL copied!');
                                    }}
                                    className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 text-xs px-2 py-1 rounded hover:bg-orange-50 w-full border border-orange-200"
                                    title="Copy Data Value API URL for this specific variable"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Data Values</span>
                                  </button>
                                )}
                                
                                {/* Analytics API */}
                                <button
                                  onClick={() => fetchAnalyticsData(variable.variable_uid)}
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 w-full"
                                  title="View analytics data"
                                >
                                  <BarChart3 className="w-3 h-3" />
                                  <span>Analytics</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && dictionary.status === 'active' && (
          <div className="space-y-6">
            {/* Analytics Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Analytics Configuration</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {/* Variable Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Variables
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                    {variables.length === 0 ? (
                      <p className="text-sm text-gray-500">No variables available</p>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={analyticsControls.selectedVariablesForAnalytics.length === variables.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyticsControls(prev => ({
                                  ...prev,
                                  selectedVariablesForAnalytics: variables.map(v => v.variable_uid)
                                }));
                              } else {
                                setAnalyticsControls(prev => ({
                                  ...prev,
                                  selectedVariablesForAnalytics: []
                                }));
                              }
                            }}
                          />
                          <span className="text-sm font-medium">Select All ({variables.length})</span>
                        </label>
                        {variables.slice(0, 10).map((variable) => (
                          <label key={variable.variable_uid} className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={analyticsControls.selectedVariablesForAnalytics.includes(variable.variable_uid)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnalyticsControls(prev => ({
                                    ...prev,
                                    selectedVariablesForAnalytics: [...prev.selectedVariablesForAnalytics, variable.variable_uid]
                                  }));
                                } else {
                                  setAnalyticsControls(prev => ({
                                    ...prev,
                                    selectedVariablesForAnalytics: prev.selectedVariablesForAnalytics.filter(uid => uid !== variable.variable_uid)
                                  }));
                                }
                              }}
                            />
                            <span className="text-sm truncate" title={variable.variable_name}>
                              {variable.variable_name}
                            </span>
                          </label>
                        ))}
                        {variables.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Showing first 10 of {variables.length} variables
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Period Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period
                  </label>
                  <select
                    value={analyticsControls.selectedPeriod}
                    onChange={(e) => setAnalyticsControls(prev => ({
                      ...prev,
                      selectedPeriod: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Organization Unit Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Unit
                  </label>
                  <select
                    value={analyticsControls.selectedOrgUnit}
                    onChange={(e) => setAnalyticsControls(prev => ({
                      ...prev,
                      selectedOrgUnit: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {orgUnits.map((orgUnit) => (
                      <option key={orgUnit.id} value={orgUnit.id}>
                        {orgUnit.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visualization Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visualization
                  </label>
                  <select
                    value={analyticsControls.visualizationType}
                    onChange={(e) => setAnalyticsControls(prev => ({
                      ...prev,
                      visualizationType: e.target.value as 'table' | 'bar' | 'line' | 'pivot'
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="table">Data Table</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pivot">Pivot Table</option>
                  </select>
                </div>
              </div>

              {/* Fetch Button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {analyticsControls.selectedVariablesForAnalytics.length > 0 ? (
                    <span>
                      {analyticsControls.selectedVariablesForAnalytics.length} variable(s) selected for {analyticsControls.selectedPeriod} at {analyticsControls.selectedOrgUnit}
                    </span>
                  ) : (
                    <span>Select variables to analyze</span>
                  )}
                </div>
                
                <button
                  onClick={fetchAnalyticsForVariables}
                  disabled={fetchingAnalytics || analyticsControls.selectedVariablesForAnalytics.length === 0}
                  className={`px-6 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                    fetchingAnalytics || analyticsControls.selectedVariablesForAnalytics.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {fetchingAnalytics ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Fetch Analytics</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analytics Results */}
            {analyticsData.combined && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Analytics Results</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {analyticsData.combined.rows.length} data points
                    </span>
                    <button
                      onClick={() => {
                        const dataToExport = {
                          variables: analyticsControls.selectedVariablesForAnalytics.map(uid => {
                            const variable = variables.find(v => v.variable_uid === uid);
                            return variable ? { uid, name: variable.variable_name } : { uid, name: uid };
                          }),
                          period: analyticsControls.selectedPeriod,
                          orgUnit: analyticsControls.selectedOrgUnit,
                          data: analyticsData.combined,
                          exportedAt: new Date().toISOString()
                        };
                        
                        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `analytics_${dictionary.name}_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Visualization based on selected type */}
                {analyticsControls.visualizationType === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          {analyticsData.combined.headers.map((header: any, index: number) => (
                            <th key={index} className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700">
                              {header.column || header.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.combined.rows.map((row: any[], rowIndex: number) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border border-gray-200 px-4 py-2 text-sm">
                                {cellIndex === 0 ? (
                                  // Show variable name for first column (dx)
                                  <div>
                                    <div className="font-medium">
                                      {analyticsData.combined.metaData?.dx?.[cell]?.name || cell}
                                    </div>
                                    <div className="text-xs text-gray-500">{cell}</div>
                                  </div>
                                ) : cellIndex === 1 ? (
                                  // Show period name for second column (pe)
                                  analyticsData.combined.metaData?.pe?.[cell]?.name || cell
                                ) : cellIndex === 2 ? (
                                  // Show org unit name for third column (ou)
                                  analyticsData.combined.metaData?.ou?.[cell]?.name || cell
                                ) : (
                                  // Show value with formatting for last column
                                  <span className="font-mono">
                                    {typeof cell === 'string' && !isNaN(Number(cell)) 
                                      ? Number(cell).toLocaleString() 
                                      : cell}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {analyticsControls.visualizationType === 'bar' && (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">Bar chart visualization</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        {analyticsData.combined.rows
                          .slice(0, 10) // Show first 10 rows
                          .map((row: any[], index: number) => {
                            const value = Number(row[3]) || 0;
                            const maxValue = Math.max(...analyticsData.combined.rows.map((r: any[]) => Number(r[3]) || 0));
                            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            
                            return (
                              <div key={index} className="flex items-center space-x-3">
                                <div className="w-32 text-sm truncate" title={analyticsData.combined.metaData?.dx?.[row[0]]?.name || row[0]}>
                                  {analyticsData.combined.metaData?.dx?.[row[0]]?.name || row[0]}
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                  <div 
                                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${Math.max(percentage, 2)}%` }}
                                  >
                                    <span className="text-white text-xs font-medium">
                                      {value.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {analyticsData.combined.rows.length > 10 && (
                        <p className="text-xs text-gray-500 mt-3">
                          Showing first 10 of {analyticsData.combined.rows.length} data points
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {analyticsControls.visualizationType === 'line' && (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">Line chart visualization (would show trend over time)</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Line chart would be implemented with a charting library like Chart.js or D3.js
                      </p>
                    </div>
                  </div>
                )}

                {analyticsControls.visualizationType === 'pivot' && (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">Pivot table view</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Pivot table functionality would be implemented with a library like PivotTable.js
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!analyticsData.combined && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <BarChart3 className="w-6 h-6 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800 mb-2">How to Use Analytics</h3>
                    <ol className="text-blue-700 text-sm space-y-1 list-decimal ml-4">
                      <li>Select one or more variables from the list above</li>
                      <li>Choose a time period (e.g., THIS_YEAR, LAST_YEAR)</li>
                      <li>Select an organization unit level</li>
                      <li>Choose your preferred visualization type</li>
                      <li>Click "Fetch Analytics" to retrieve and display the data</li>
                    </ol>
                    <p className="text-blue-600 text-sm mt-3">
                      💡 The data will be fetched directly from your DHIS2 instance and cached for faster subsequent access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 