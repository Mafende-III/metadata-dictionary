'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Download, 
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileJson
} from 'lucide-react';

interface SqlViewDataTableProps {
  data: Record<string, unknown>[];
  headers: string[];
  loading?: boolean;
  className?: string;
  pageSize?: number;
  showExport?: boolean;
  showFilter?: boolean;
  showPagination?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface ColumnFilter {
  column: string;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
}

export default function SqlViewDataTable({
  data,
  headers,
  loading = false,
  className = '',
  pageSize = 25,
  showExport = true,
  showFilter = true,
  showPagination = true
}: SqlViewDataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // Apply filters and sorting
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value || '').toLowerCase().includes(globalFilter.toLowerCase())
        )
      );
    }

    // Apply column filters
    columnFilters.forEach(filter => {
      filtered = filtered.filter(row => {
        const cellValue = String(row[filter.column] || '').toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case 'equals':
            return cellValue === filterValue;
          case 'startsWith':
            return cellValue.startsWith(filterValue);
          case 'endsWith':
            return cellValue.endsWith(filterValue);
          case 'contains':
          default:
            return cellValue.includes(filterValue);
        }
      });
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return sortDirection === 'asc' ? 1 : -1;

        // Convert to strings for comparison
        const aStr = String(aVal);
        const bStr = String(bVal);

        // Try numeric comparison first
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const comparison = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, globalFilter, columnFilters, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!showPagination) return processedData;
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, showPagination]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Add column filter
  const addColumnFilter = (column: string) => {
    const existingFilter = columnFilters.find(f => f.column === column);
    if (!existingFilter) {
      setColumnFilters(prev => [
        ...prev,
        { column, value: '', operator: 'contains' }
      ]);
    }
  };

  // Update column filter
  const updateColumnFilter = (column: string, value: string, operator: ColumnFilter['operator']) => {
    setColumnFilters(prev =>
      prev.map(filter =>
        filter.column === column ? { ...filter, value, operator } : filter
      )
    );
  };

  // Remove column filter
  const removeColumnFilter = (column: string) => {
    setColumnFilters(prev => prev.filter(f => f.column !== column));
  };

  // Export functionality
  const exportData = (format: 'csv' | 'json') => {
    const dataToExport = processedData;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'csv') {
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row =>
          headers.map(header => {
            const value = row[header];
            const stringValue = value != null ? String(value) : '';
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          }).join(',')
        )
      ].join('\n');
      
      downloadFile(csvContent, `sqlview-data-${timestamp}.csv`, 'text/csv');
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      downloadFile(jsonContent, `sqlview-data-${timestamp}.json`, 'application/json');
    }
  };

  // Download helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (loading) {
    return (
      <div className={`bg-white border rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white border rounded-lg p-6 text-center text-gray-500 ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {showFilter && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search all columns..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {showFilter && (
              <button
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className={`flex items-center space-x-2 px-3 py-2 border rounded-md transition-colors ${
                  showColumnFilters || columnFilters.length > 0
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {columnFilters.length > 0 && (
                  <span className="bg-white text-blue-500 rounded-full px-2 py-0.5 text-xs font-medium">
                    {columnFilters.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {showExport && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportData('csv')}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportData('json')}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <FileJson className="h-4 w-4" />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Column Filters */}
        {showColumnFilters && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {headers.map(header => {
                const hasFilter = columnFilters.some(f => f.column === header);
                return (
                  <button
                    key={header}
                    onClick={() => hasFilter ? removeColumnFilter(header) : addColumnFilter(header)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      hasFilter
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {header}
                    {hasFilter && <X className="inline h-3 w-3 ml-1" />}
                  </button>
                );
              })}
            </div>
            
            {columnFilters.map(filter => (
              <div key={filter.column} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                <span className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
                  {filter.column}:
                </span>
                <select
                  value={filter.operator}
                  onChange={(e) => updateColumnFilter(filter.column, filter.value, e.target.value as ColumnFilter['operator'])}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="startsWith">Starts with</option>
                  <option value="endsWith">Ends with</option>
                </select>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateColumnFilter(filter.column, e.target.value, filter.operator)}
                  placeholder="Filter value..."
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                />
                <button
                  onClick={() => removeColumnFilter(filter.column)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={`h-3 w-3 ${
                          sortColumn === header && sortDirection === 'asc' 
                            ? 'text-blue-500' 
                            : 'text-gray-300'
                        }`} 
                      />
                      <ChevronDown 
                        className={`h-3 w-3 -mt-1 ${
                          sortColumn === header && sortDirection === 'desc' 
                            ? 'text-blue-500' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {headers.map((header) => {
                  const value = row[header];
                  return (
                    <td key={header} className="px-3 py-2 text-sm text-gray-900">
                      {value !== null && value !== undefined ? String(value) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * pageSize + 1, processedData.length)} to{' '}
              {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 