import { BaseMetadata, QualityAssessment } from '../types/metadata';

// Export formats
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
  PYTHON = 'python',
  JUPYTER = 'jupyter',
  API_LINKS = 'api-links',
}

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeQuality?: boolean;
  includeDescription?: boolean;
  includeApiUrls?: boolean;
  filename?: string;
  pythonLibrary?: 'requests' | 'dhis2.py' | 'pandas';
  apiUrlFormat?: 'full' | 'relative' | 'list';
}

// Export service
export class ExportService {
  // Export single metadata item
  static exportMetadata<T extends BaseMetadata>(
    metadata: T,
    quality?: QualityAssessment,
    options: ExportOptions = { format: ExportFormat.JSON, includeQuality: true }
  ): string {
    const filename = options.filename || `${metadata.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    // Prepare data for export
    const exportData = options.includeQuality && quality
      ? { metadata, quality }
      : metadata;
    
    // Generate the export file
    let fileContent = '';
    let mimeType = '';
    
    if (options.format === ExportFormat.CSV) {
      fileContent = this.convertToCSV(exportData);
      mimeType = 'text/csv';
    } else {
      fileContent = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
    }
    
    // Return the file content (in web apps, would trigger download)
    return fileContent;
  }
  
  // Export multiple metadata items
  static exportMetadataList<T extends BaseMetadata>(
    metadataList: T[],
    qualityList?: QualityAssessment[],
    options: ExportOptions = { format: ExportFormat.JSON, includeQuality: true }
  ): string {
    const filename = options.filename || `metadata_export_${new Date().toISOString().split('T')[0]}`;
    
    // Prepare data for export
    const exportData = metadataList.map((metadata, index) => {
      const quality = qualityList && qualityList[index] 
        ? qualityList[index]
        : undefined;
        
      return options.includeQuality && quality
        ? { metadata, quality }
        : metadata;
    });
    
    // Generate the export file
    let fileContent = '';
    let mimeType = '';
    
    if (options.format === ExportFormat.CSV) {
      fileContent = this.convertToCSV(exportData);
      mimeType = 'text/csv';
    } else {
      fileContent = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
    }
    
    // Return the file content (in web apps, would trigger download)
    return fileContent;
  }
  
  // Convert object to CSV
  private static convertToCSV(data: any): string {
    if (!data || !data.length) {
      return '';
    }
    
    // Function to flatten nested objects
    const flattenObject = (obj: any, prefix = ''): any => {
      const flattened: any = {};
      
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          // For arrays, join values with a pipe
          flattened[newKey] = value.map(v => 
            typeof v === 'object' && v !== null 
              ? JSON.stringify(v) 
              : v
          ).join('|');
        } else {
          flattened[newKey] = value;
        }
      });
      
      return flattened;
    };
    
    // Flatten each object in the data array
    const flattenedData = Array.isArray(data) 
      ? data.map(item => flattenObject(item))
      : [flattenObject(data)];
    
    // Get all unique headers
    const headers = Array.from(
      new Set(
        flattenedData.reduce((allKeys, obj) => {
          return allKeys.concat(Object.keys(obj));
        }, [] as string[])
      )
    );
    
    // Build CSV string
    const csvRows = [
      headers.join(','), // Header row
            ...flattenedData.map(obj => 
        headers.map(header => {
          const objTyped = obj as Record<string, unknown>;
          const headerKey = String(header);
          const value = objTyped[headerKey] === undefined ? '' : String(objTyped[headerKey]);
          // Escape quotes and wrap in quotes if the value contains a comma
          const formatted = typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
          return formatted;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }
  
  // Generate Python integration code
  static generatePythonCode(
    data: any[],
    options: ExportOptions,
    dictionaryName: string,
    instanceUrl: string
  ): string {
    const timestamp = new Date().toISOString();
    const library = options.pythonLibrary || 'requests';
    
    let code = `"""
DHIS2 Metadata Dictionary Integration Code
Generated: ${timestamp}
Dictionary: ${dictionaryName}
Instance: ${instanceUrl}
Total Variables: ${data.length}

This code provides ready-to-use functions for accessing DHIS2 metadata
and data values programmatically.
"""

import ${library === 'requests' ? 'requests' : library === 'dhis2.py' ? 'dhis2' : 'pandas as pd'}
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

`;

    if (library === 'requests') {
      code += `
class DHIS2MetadataClient:
    """Client for accessing DHIS2 metadata and data using requests library."""
    
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth
        
    def get_metadata_variables(self) -> List[Dict[str, Any]]:
        """Get all metadata variables from this dictionary."""
        variables = [
${data.slice(0, 20).map((item: any) => `            {
                "uid": "${item.uid || item.id}",
                "name": "${(item.name || item.displayName || '').replace(/"/g, '\\"')}",
                "type": "${item.type || 'unknown'}",
                ${item.analytics_url ? `"analytics_url": "${item.analytics_url}",` : ''}
                ${item.qualityScore || item.quality_score ? `"quality_score": ${item.qualityScore || item.quality_score},` : ''}
                ${item.description ? `"description": "${item.description.replace(/"/g, '\\"')}",` : ''}
            }`).join(',\n')}
            # ... Additional ${data.length - 20} variables truncated for readability
        ]
        return variables
        
    def get_data_values(self, variable_uid: str, period: str = "LAST_12_MONTHS", 
                       org_unit: str = "LEVEL-1") -> Dict[str, Any]:
        """Fetch data values for a specific variable."""
        url = f"{self.base_url}/api/analytics"
        params = {
            "dimension": [f"dx:{variable_uid}", f"pe:{period}", f"ou:{org_unit}"],
            "displayProperty": "NAME",
            "outputFormat": "JSON"
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for {variable_uid}: {e}")
            return {}
            
    def bulk_data_export(self, variable_uids: List[str], period: str = "LAST_12_MONTHS",
                        org_unit: str = "LEVEL-1") -> Dict[str, Any]:
        """Export data for multiple variables efficiently."""
        if not variable_uids:
            return {}
            
        # DHIS2 supports multiple dimensions in single request
        dx_dimension = ";".join(variable_uids)
        url = f"{self.base_url}/api/analytics"
        params = {
            "dimension": [f"dx:{dx_dimension}", f"pe:{period}", f"ou:{org_unit}"],
            "displayProperty": "NAME",
            "outputFormat": "JSON"
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in bulk export: {e}")
            return {}

# Example usage:
if __name__ == "__main__":
    # Initialize client
    client = DHIS2MetadataClient(
        base_url="${instanceUrl}",
        username="your_username",
        password="your_password"
    )
    
    # Get all variables
    variables = client.get_metadata_variables()
    print(f"Found {len(variables)} variables")
    
    # Example: Get data for first variable
    if variables:
        first_var = variables[0]
        data = client.get_data_values(first_var["uid"])
        print(f"Data for {first_var['name']}: {data}")
        
    # Example: Bulk export for high-quality variables
    high_quality_vars = [v["uid"] for v in variables if v.get("quality_score", 0) > 80]
    if high_quality_vars:
        bulk_data = client.bulk_data_export(high_quality_vars[:10])  # Limit to 10 for demo
        print(f"Bulk data exported for {len(high_quality_vars)} variables")
`;
    }

    return code;
  }

  // Generate Jupyter notebook
  static generateJupyterNotebook(
    data: any[],
    dictionaryName: string,
    instanceUrl: string
  ): string {
    const timestamp = new Date().toISOString();
    
    const notebook = {
      cells: [
        {
          cell_type: "markdown",
          metadata: {},
          source: [
            `# DHIS2 Metadata Dictionary Analysis\\n`,
            `\\n`,
            `**Dictionary:** ${dictionaryName}  \\n`,
            `**Instance:** ${instanceUrl}  \\n`,
            `**Generated:** ${timestamp}  \\n`,
            `**Total Variables:** ${data.length}\\n`,
            `\\n`,
            `This notebook provides interactive analysis tools for your DHIS2 metadata dictionary.\\n`
          ]
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "# Import required libraries\\n",
            "import pandas as pd\\n",
            "import requests\\n",
            "import matplotlib.pyplot as plt\\n",
            "import seaborn as sns\\n",
            "from typing import Dict, List, Any\\n",
            "import json\\n",
            "\\n",
            "# Set up plotting\\n",
            "plt.style.use('default')\\n",
            "sns.set_palette('husl')"
          ]
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "# DHIS2 Configuration\\n",
            `BASE_URL = "${instanceUrl}"\\n`,
            "USERNAME = \"your_username\"  # Replace with your username\\n",
            "PASSWORD = \"your_password\"  # Replace with your password\\n",
            "\\n",
            "# Create session\\n",
            "session = requests.Session()\\n",
            "session.auth = (USERNAME, PASSWORD)"
          ]
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "# Load metadata dictionary\\n",
            "metadata_variables = [\\n",
            ...data.slice(0, 20).map((item: any) => `    {
        "uid": "${item.uid || item.id}",
        "name": "${(item.name || item.displayName || '').replace(/"/g, '\\"')}",
        "type": "${item.type || 'unknown'}",
        ${item.analytics_url ? `"analytics_url": "${item.analytics_url}",` : ''}
        ${item.qualityScore || item.quality_score ? `"quality_score": ${item.qualityScore || item.quality_score},` : ''}
    }`),
            "    # ... Additional variables truncated for notebook size\\n",
            "]\\n",
            "\\n",
            "# Convert to DataFrame\\n",
            "df = pd.DataFrame(metadata_variables)\\n",
            "print(f\"Loaded {len(df)} metadata variables\")\\n",
            "df.head()"
          ]
        }
      ],
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3"
        },
        language_info: {
          name: "python",
          version: "3.8.0"
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    return JSON.stringify(notebook, null, 2);
  }

  // Generate API links export
  static generateApiLinks(
    data: any[],
    options: ExportOptions,
    instanceUrl: string
  ): string {
    const urlFormat = options.apiUrlFormat || 'full';
    const timestamp = new Date().toISOString();
    
    let content = `# DHIS2 API Links Export
# Generated: ${timestamp}
# Instance: ${instanceUrl}
# Total Variables: ${data.length}
# Format: ${urlFormat}

`;

    if (urlFormat === 'list') {
      // Simple list format
      data.forEach((item: any) => {
        const analyticsUrl = item.analytics_url || `/api/analytics?dimension=dx:${item.uid || item.id}`;
        const url = `${instanceUrl}${analyticsUrl}`;
        content += `${url}\\n`;
      });
    } else {
      // Structured format with metadata
      data.forEach((item: any) => {
        content += `# ${item.name || item.displayName} (${item.uid || item.id})\\n`;
        if (item.description) {
          content += `# Description: ${item.description}\\n`;
        }
        if (item.qualityScore || item.quality_score) {
          content += `# Quality Score: ${item.qualityScore || item.quality_score}\\n`;
        }
        
        const analyticsUrl = item.analytics_url || `/api/analytics?dimension=dx:${item.uid || item.id}`;
        const url = urlFormat === 'full' ? `${instanceUrl}${analyticsUrl}` : analyticsUrl;
        content += `${url}\\n`;
        content += `\\n`;
      });
    }

    return content;
  }

  // Enhanced export method for dictionaries
  static async exportDictionary(
    data: any[],
    dictionaryName: string,
    instanceUrl: string,
    options: ExportOptions
  ): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = dictionaryName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (options.format) {
      case ExportFormat.CSV:
        content = this.convertToCSV(data);
        filename = `${safeName}_${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
        
      case ExportFormat.JSON:
        content = JSON.stringify(data, null, 2);
        filename = `${safeName}_${timestamp}.json`;
        mimeType = 'application/json';
        break;
        
      case ExportFormat.PYTHON:
        content = this.generatePythonCode(data, options, dictionaryName, instanceUrl);
        filename = `${safeName}_integration_${timestamp}.py`;
        mimeType = 'text/x-python';
        break;
        
      case ExportFormat.JUPYTER:
        content = this.generateJupyterNotebook(data, dictionaryName, instanceUrl);
        filename = `${safeName}_analysis_${timestamp}.ipynb`;
        mimeType = 'application/json';
        break;
        
      case ExportFormat.API_LINKS:
        content = this.generateApiLinks(data, options, instanceUrl);
        filename = `${safeName}_api_links_${timestamp}.txt`;
        mimeType = 'text/plain';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Create a download link for the browser
  static createDownloadLink(content: string, filename: string, format: ExportFormat): string {
    const mimeTypeMap = {
      [ExportFormat.CSV]: 'text/csv',
      [ExportFormat.JSON]: 'application/json',
      [ExportFormat.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ExportFormat.PYTHON]: 'text/x-python',
      [ExportFormat.JUPYTER]: 'application/json',
      [ExportFormat.API_LINKS]: 'text/plain',
    };
    
    const mimeType = mimeTypeMap[format] || 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    return url;
  }
} 