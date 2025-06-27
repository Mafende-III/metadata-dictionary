/**
 * Dedicated service for SQL View data transformation and formatting
 * Handles data processing, filtering, sorting, and format conversion
 */
export class SqlViewTransformService {
  
  /**
   * Transform raw SQL view data into structured format
   */
  static transformToStructuredData(
    data: unknown[],
    headers: string[]
  ): Array<Record<string, unknown>> {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // If data is already in object format, return as-is
    if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      return data as Array<Record<string, unknown>>;
    }

    // Transform array rows to objects using headers
    return data.map((row) => {
      if (Array.isArray(row)) {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      }
      return row as Record<string, unknown>;
    });
  }

  /**
   * Apply filters to data
   */
  static applyFilters(
    data: Array<Record<string, unknown>>,
    filters: Record<string, string>
  ): Array<Record<string, unknown>> {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter((row) => {
      return Object.entries(filters).every(([column, filterValue]) => {
        const cellValue = row[column];
        
        if (cellValue === null || cellValue === undefined) {
          return filterValue === '' || filterValue === 'null';
        }

        const cellStr = String(cellValue).toLowerCase();
        const filterStr = filterValue.toLowerCase();

        // Support different filter operations
        if (filterStr.startsWith('>=')) {
          const numValue = parseFloat(filterStr.substring(2));
          return !isNaN(numValue) && parseFloat(cellStr) >= numValue;
        }
        
        if (filterStr.startsWith('<=')) {
          const numValue = parseFloat(filterStr.substring(2));
          return !isNaN(numValue) && parseFloat(cellStr) <= numValue;
        }
        
        if (filterStr.startsWith('>')) {
          const numValue = parseFloat(filterStr.substring(1));
          return !isNaN(numValue) && parseFloat(cellStr) > numValue;
        }
        
        if (filterStr.startsWith('<')) {
          const numValue = parseFloat(filterStr.substring(1));
          return !isNaN(numValue) && parseFloat(cellStr) < numValue;
        }
        
        if (filterStr.startsWith('=')) {
          return cellStr === filterStr.substring(1);
        }
        
        if (filterStr.startsWith('!=')) {
          return cellStr !== filterStr.substring(2);
        }

        // Default: contains filter
        return cellStr.includes(filterStr);
      });
    });
  }

  /**
   * Sort data by column
   */
  static sortData(
    data: Array<Record<string, unknown>>,
    sortColumn: string,
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Array<Record<string, unknown>> {
    if (!sortColumn) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (bVal === null || bVal === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      // Try numeric comparison first
      const aNum = parseFloat(String(aVal));
      const bNum = parseFloat(String(bVal));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Paginate data
   */
  static paginateData(
    data: Array<Record<string, unknown>>,
    page: number = 1,
    pageSize: number = 50
  ): {
    data: Array<Record<string, unknown>>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Convert data to CSV format
   */
  static convertToCSV(
    data: Array<Record<string, unknown>>,
    headers?: string[]
  ): string {
    if (data.length === 0) {
      return '';
    }

    const columns = headers || Object.keys(data[0]);
    const csvHeaders = columns.join(',');
    
    const csvRows = data.map(row => {
      return columns.map(column => {
        const value = row[column];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Convert data to Excel-compatible format
   */
  static convertToExcelData(
    data: Array<Record<string, unknown>>,
    headers?: string[]
  ): Array<Array<unknown>> {
    if (data.length === 0) {
      return [];
    }

    const columns = headers || Object.keys(data[0]);
    const excelData = [columns]; // Header row
    
    data.forEach((row: any) => {
      const rowData = columns.map(column => String(row[column] || ''));
      excelData.push(rowData);
    });

    return excelData;
  }

  /**
   * Get data summary statistics
   */
  static getDataSummary(
    data: Array<Record<string, unknown>>,
    headers: string[]
  ): Record<string, {
    type: 'numeric' | 'text' | 'date' | 'boolean';
    uniqueValues: number;
    nullCount: number;
    min?: unknown;
    max?: unknown;
    average?: number;
  }> {
    const summary: Record<string, {
      type: 'numeric' | 'text' | 'date' | 'boolean';
      uniqueValues: number;
      nullCount: number;
      min?: unknown;
      max?: unknown;
      average?: number;
    }> = {};

    headers.forEach(header => {
      const columnData = data.map(row => row[header]);
      const nonNullData = columnData.filter(val => val !== null && val !== undefined);
      const uniqueValues = new Set(nonNullData).size;
      const nullCount = columnData.length - nonNullData.length;

      // Determine data type
      let type: 'numeric' | 'text' | 'date' | 'boolean' = 'text';
      let min: unknown = undefined;
      let max: unknown = undefined;
      let average: number | undefined = undefined;

      if (nonNullData.length > 0) {
        // Check if numeric
        const numericData = nonNullData.map(val => parseFloat(String(val))).filter(val => !isNaN(val));
        if (numericData.length > 0 && numericData.length / nonNullData.length > 0.8) {
          type = 'numeric';
          min = Math.min(...numericData);
          max = Math.max(...numericData);
          average = numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
        }
        // Check if boolean
        else if (nonNullData.every(val => 
          typeof val === 'boolean' || 
          ['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase())
        )) {
          type = 'boolean';
        }
        // Check if date
        else if (nonNullData.some(val => {
          const date = new Date(String(val));
          return !isNaN(date.getTime()) && String(val).match(/\d{4}-\d{2}-\d{2}/);
        })) {
          type = 'date';
          const dates = nonNullData.map(val => new Date(String(val))).filter(date => !isNaN(date.getTime()));
          if (dates.length > 0) {
            min = new Date(Math.min(...dates.map(d => d.getTime())));
            max = new Date(Math.max(...dates.map(d => d.getTime())));
          }
        }
      }

      summary[header] = {
        type,
        uniqueValues,
        nullCount,
        min,
        max,
        average
      };
    });

    return summary;
  }

  /**
   * Detect column data types
   */
  static detectColumnTypes(
    data: Array<Record<string, unknown>>,
    headers: string[]
  ): Record<string, 'number' | 'string' | 'date' | 'boolean'> {
    const types: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {};

    headers.forEach(header => {
      const columnData = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      
      if (columnData.length === 0) {
        types[header] = 'string';
        return;
      }

      // Check numeric
      const numericCount = columnData.filter(val => !isNaN(parseFloat(String(val)))).length;
      if (numericCount / columnData.length > 0.8) {
        types[header] = 'number';
        return;
      }

      // Check boolean
      const booleanCount = columnData.filter(val => 
        ['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase())
      ).length;
      if (booleanCount / columnData.length > 0.8) {
        types[header] = 'boolean';
        return;
      }

      // Check date
      const dateCount = columnData.filter(val => {
        const date = new Date(String(val));
        return !isNaN(date.getTime());
      }).length;
      if (dateCount / columnData.length > 0.5) {
        types[header] = 'date';
        return;
      }

      types[header] = 'string';
    });

    return types;
  }
}