import { BaseMetadata, QualityAssessment } from '../types/metadata';

// Export formats
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeQuality?: boolean;
  filename?: string;
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
          const value = (obj as Record<string, unknown>)[header] === undefined ? '' : (obj as Record<string, unknown>)[header];
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
  
  // Create a download link for the browser
  static createDownloadLink(content: string, filename: string, format: ExportFormat): string {
    const mimeType = format === ExportFormat.CSV ? 'text/csv' : 'application/json';
    const extension = format === ExportFormat.CSV ? 'csv' : 'json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    return url;
  }
} 