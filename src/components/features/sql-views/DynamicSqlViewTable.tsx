'use client';

import { useState, useMemo } from 'react';

interface SqlViewField {
  name: string;
  column: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
}

interface SqlViewTemplate {
  id: string;
  name: string;
  description: string;
  outputFields: SqlViewField[];
}

interface Props {
  data: any[];
  headers: any[];
  template: SqlViewTemplate;
  title: string;
}

export default function DynamicSqlViewTable({ data, headers, template, title }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{column: number, direction: 'asc' | 'desc'} | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[]>(
    headers.map((_, index) => index) // Show all columns by default
  );

  // Enhanced headers with template field information
  const enhancedHeaders = useMemo(() => {
    return headers.map((header, index) => {
      const templateField = template.outputFields[index];
      return {
        ...header,
        displayName: templateField?.name || header.name || header.column || `Column ${index + 1}`,
        description: templateField?.description || `Data from ${header.column || 'column ' + index}`,
        type: templateField?.type || 'string',
        templateField
      };
    });
  }, [headers, template.outputFields]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(row => 
        row.some((cell: any) => 
          String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  const handleSort = (columnIndex: number) => {
    setSortConfig(current => ({
      column: columnIndex,
      direction: current?.column === columnIndex && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatCellValue = (value: any, type: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'boolean':
        return (
          <span className={`px-2 py-1 rounded text-xs ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      default:
        return String(value);
    }
  };

  const exportToCSV = () => {
    const csvHeaders = selectedColumns.map(i => enhancedHeaders[i].displayName).join(',');
    const csvRows = processedData.map(row => 
      selectedColumns.map(i => `"${row[i] || ''}"`).join(',')
    ).join('\n');
    
    const csvContent = `${csvHeaders}\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header with Template Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-blue-900">{title}</h2>
            <p className="text-blue-700 text-sm mt-1">{template.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                {data.length} rows
              </span>
              <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                {enhancedHeaders.length} columns
              </span>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
      </div>

      {/* Dynamic Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selectedColumns.map(columnIndex => {
                const header = enhancedHeaders[columnIndex];
                return (
                  <th 
                    key={columnIndex}
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(columnIndex)}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{header.displayName}</div>
                        <div className="text-xs text-gray-500 font-normal">
                          {header.type}
                        </div>
                      </div>
                      <div className="text-gray-400">
                        {sortConfig?.column === columnIndex ? (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        ) : '↕'}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t hover:bg-gray-50">
                {selectedColumns.map(columnIndex => {
                  const header = enhancedHeaders[columnIndex];
                  return (
                    <td key={columnIndex} className="px-4 py-3">
                      {formatCellValue(row[columnIndex], header.type)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {processedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? `No results found for "${searchTerm}"` : 'No data available'}
        </div>
      )}
    </div>
  );
} 