import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Download, 
  RefreshCw, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface EnhancedSqlViewTableProps {
  sqlViewId: string;
  initialBatchSize?: number;
  maxRows?: number;
  autoLoad?: boolean;
}

interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  loading: boolean;
  completed: boolean;
}

interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sortable: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

export default function EnhancedSqlViewTable({ 
  sqlViewId, 
  initialBatchSize = 50,
  maxRows = 10000,
  autoLoad = true 
}: EnhancedSqlViewTableProps) {
  // State management
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    loading: false,
    completed: false
  });

  // Table controls
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Authentication
  const { isAuthenticated, authToken, dhisBaseUrl } = useAuthStore();

  // Auto-detect column types
  const detectColumnType = (values: any[]): 'string' | 'number' | 'date' | 'boolean' => {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonNullValues.length === 0) return 'string';

    // Check for numbers
    const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
    if (numericCount / nonNullValues.length > 0.8) return 'number';

    // Check for dates
    const dateCount = nonNullValues.filter(v => {
      const date = new Date(v);
      return !isNaN(date.getTime()) && v.toString().match(/\d{4}-\d{2}-\d{2}/);
    }).length;
    if (dateCount / nonNullValues.length > 0.5) return 'date';

    // Check for booleans
    const booleanCount = nonNullValues.filter(v => 
      ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toString().toLowerCase())
    ).length;
    if (booleanCount / nonNullValues.length > 0.8) return 'boolean';

    return 'string';
  };

  // Process data and extract columns
  const processData = (rawData: any[]) => {
    if (!rawData || rawData.length === 0) {
      setColumns([]);
      return [];
    }

    // Extract column information
    const firstRow = rawData[0];
    const columnKeys = Object.keys(firstRow);
    
    const detectedColumns: TableColumn[] = columnKeys.map(key => {
      const values = rawData.map(row => row[key]);
      const type = detectColumnType(values);
      
      return {
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type,
        sortable: true
      };
    });

    setColumns(detectedColumns);
    return rawData;
  };

  // Fetch data with multi-page processing
  const fetchDataWithBatches = async () => {
    if (!isAuthenticated || !authToken || !dhisBaseUrl) {
      setError('Not authenticated. Please log in first.');
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);
    setProgress({
      current: 0,
      total: 1, // Will be updated as we discover pages
      percentage: 0,
      loading: true,
      completed: false
    });

    try {
      console.log('🚀 Starting multi-page data fetch for SQL View:', sqlViewId);

      // Try the enhanced batch API first
      let allData: any[] = [];
      let totalPages = 0;

      try {
        const response = await fetch(`/api/dhis2/sql-views?id=${sqlViewId}&action=executeBatch`, {
          headers: {
            'Authorization': `Basic ${authToken}`,
            'x-dhis2-base-url': dhisBaseUrl,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && Array.isArray(result.data)) {
            allData = processData(result.data);
            totalPages = result.batches || 1;
            console.log(`✅ Batch API: ${allData.length} rows from ${totalPages} batches`);
          }
        }
      } catch (batchError) {
        console.log('⚠️ Batch API failed, falling back to direct multi-page fetch');
      }

      // If batch API failed or returned no data, try direct multi-page fetch
      if (allData.length === 0) {
        console.log('🔄 Using direct multi-page fetch as fallback');
        
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages && currentPage <= 20) { // Safety limit
          console.log(`📄 Fetching page ${currentPage}...`);
          
          // Update progress
          setProgress(prev => ({
            ...prev,
            current: currentPage,
            total: Math.max(prev.total, currentPage + 1),
            percentage: Math.min(90, (currentPage / (currentPage + 1)) * 100)
          }));

          try {
            // Use the proxy endpoint which is more reliable for multi-page fetching
            const pageUrl = `/api/dhis2/proxy?path=/sqlViews/${sqlViewId}/data.json${currentPage > 1 ? `&page=${currentPage}` : ''}`;
            const response = await fetch(pageUrl, {
              headers: {
                'Authorization': `Basic ${authToken}`,
                'x-dhis2-base-url': dhisBaseUrl,
                'Accept': 'application/json',
              }
            });
            
            if (!response.ok) {
              console.log(`❌ Page ${currentPage} failed with status: ${response.status}`);
              break;
            }
            
            const result = await response.json();
            let pageData: any[] = [];
            
            // Extract data from DHIS2 listGrid response format
            if (result.listGrid && result.listGrid.rows) {
              const { headers, rows } = result.listGrid;
              pageData = rows.map((row: any[]) => {
                const obj: any = {};
                headers.forEach((header: any, index: number) => {
                  const columnName = header.name || header.column || `col_${index}`;
                  obj[columnName] = row[index];
                });
                return obj;
              });
            } else if (result.data && Array.isArray(result.data)) {
              pageData = result.data;
            } else if (Array.isArray(result)) {
              pageData = result;
            }
            
            if (pageData.length === 0) {
              hasMorePages = false;
              break;
            }
            
            // Process and add page data
            const processedPageData = processData(pageData);
            allData = [...allData, ...processedPageData];
            totalPages = currentPage;
            
            console.log(`✅ Page ${currentPage}: ${pageData.length} rows (Total: ${allData.length})`);
            
            // Check if this might be the last page
            hasMorePages = pageData.length >= 50; // Typical page size
            currentPage++;
            
            // Respect maxRows limit
            if (allData.length >= maxRows) {
              console.log(`🛑 Reached maxRows limit: ${maxRows}`);
              allData = allData.slice(0, maxRows);
              hasMorePages = false;
            }
            
          } catch (pageError) {
            console.error(`❌ Error fetching page ${currentPage}:`, pageError);
            hasMorePages = false;
          }
        }
      }

      if (allData.length > 0) {
        setData(allData);
        console.log(`🎯 Multi-page fetch complete: ${allData.length} total rows from ${totalPages} pages`);
      } else {
        setError('No data retrieved from any page');
      }

      setProgress({
        current: totalPages,
        total: totalPages,
        percentage: 100,
        loading: false,
        completed: true
      });

    } catch (err) {
      console.error('❌ Multi-page fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setProgress(prev => ({ ...prev, loading: false }));
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row => {
          const cellValue = row[key]?.toString().toLowerCase() || '';
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const column = columns.find(col => col.key === sortConfig.key);
        
        if (column?.type === 'number') {
          const aNum = parseFloat(aVal) || 0;
          const bNum = parseFloat(bVal) || 0;
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        if (column?.type === 'date') {
          const aDate = new Date(aVal).getTime() || 0;
          const bDate = new Date(bVal).getTime() || 0;
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        const aStr = aVal?.toString() || '';
        const bStr = bVal?.toString() || '';
        return sortConfig.direction === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortConfig, columns]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === columnKey) {
        return prev.direction === 'asc' 
          ? { key: columnKey, direction: 'desc' }
          : null;
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  // Handle filtering
  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (processedData.length === 0) return;

    const headers = columns.map(col => col.label).join(',');
    const csvContent = processedData.map(row =>
      columns.map(col => {
        const value = row[col.key];
        return value?.toString().includes(',') ? `"${value}"` : value;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${csvContent}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql-view-${sqlViewId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && sqlViewId && isAuthenticated) {
      fetchDataWithBatches();
    }
  }, [sqlViewId, isAuthenticated, autoLoad]);

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Progress Bar */}
      {progress.loading && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Loading Data - Batch {progress.current} of {progress.total}
            </span>
            <span className="text-sm text-blue-700">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900">
              SQL View Data ({processedData.length.toLocaleString()} rows)
            </h3>
            {progress.completed && (
              <span className="text-sm text-green-600 font-medium">
                ✓ Loaded in {progress.current} batches
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDataWithBatches}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={exportToCSV}
              disabled={processedData.length === 0}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {searchTerm && (
            <span className="text-sm text-gray-600">
              {processedData.length} of {data.length} rows
            </span>
          )}
        </div>

        {/* Column Filters */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {columns.slice(0, 8).map(column => (
              <div key={column.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {column.label}
                </label>
                <input
                  type="text"
                  placeholder={`Filter ${column.label.toLowerCase()}...`}
                  value={filters[column.key] || ''}
                  onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {paginatedData.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      {renderSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map(column => (
                    <td key={column.key} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {row[column.key]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading && !error ? (
          <div className="text-center py-12 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Click "Refresh" to load data from the SQL view</p>
          </div>
        ) : null}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span>rows per page</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({processedData.length.toLocaleString()} total rows)
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}