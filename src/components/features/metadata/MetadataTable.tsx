import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { QualityBadge } from './QualityBadge';
import { BaseMetadata, MetadataWithQuality, MetadataFilter } from '@/types/metadata';
import { formatDate, truncateText } from '@/lib/utils';
import { PAGE_SIZES } from '@/lib/constants';

interface MetadataTableProps<T extends BaseMetadata> {
  data: MetadataWithQuality<T>[];
  basePath: string;
  isLoading?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  filters: MetadataFilter;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export const MetadataTable = <T extends BaseMetadata>({
  data,
  basePath,
  isLoading = false,
  pagination,
  filters,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: MetadataTableProps<T>) => {
  // Calculate pagination details
  const { page, pageSize, total, pageCount } = pagination;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({
    key: filters.sortBy || 'displayName',
    direction: filters.sortDirection || 'asc',
  });
  
  // Handle sort click
  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSortChange(key, direction);
  };

  // Render mobile card view
  const renderMobileCardView = () => {
    if (data.length === 0) return null;

    return (
      <div className="space-y-4">
        {data.map(({ metadata, quality }) => (
          <div key={metadata.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {metadata.displayName || metadata.name}
                </h3>
                {metadata.code && (
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {metadata.code}
                  </p>
                )}
              </div>
              <QualityBadge score={quality.qualityScore} size="sm" />
            </div>
            
            <div className="text-sm text-gray-500 mb-3">
              {metadata.description
                ? truncateText(metadata.description, 80)
                : (
                  <span className="text-gray-400 italic">
                    No description
                  </span>
                )
              }
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
              <div>
                <span className="font-medium text-gray-500">Created:</span>
                <div className="text-gray-700">{formatDate(metadata.created)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-500">Updated:</span>
                <div className="text-gray-700">{formatDate(metadata.lastUpdated)}</div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link href={`${basePath}/${metadata.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render pagination
  const renderPagination = () => {
    if (total === 0) return null;
    
    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === pageCount}
          >
            Next
          </Button>
        </div>
        
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </p>
          </div>
          
          <div>
            <div className="flex items-center space-x-4">
              <div>
                <select
                  className="rounded-md border-gray-300 py-1 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              </div>
              
              <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-l-md"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  // Calculate page numbers to show centered around current page
                  let pageNum = i + 1;
                  if (pageCount > 5) {
                    if (page > 3) {
                      pageNum = page - 3 + i;
                    }
                    if (page > pageCount - 2) {
                      pageNum = pageCount - 4 + i;
                    }
                  }
                  
                  // Ensure page number is valid
                  if (pageNum > 0 && pageNum <= pageCount) {
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        className="border-gray-300"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === pageCount}
                  className="rounded-r-md"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No metadata found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Mobile view (md screens and smaller) */}
      <div className="block lg:hidden">
        {!isLoading && renderMobileCardView()}
      </div>
      
      {/* Desktop table view (lg screens and larger) */}
      <div className="hidden lg:block">
        {!isLoading && (
          <div className="overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
            <div className="overflow-x-auto">
              <Table hover>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell
                      sortable
                      sorted={sortConfig.key === 'displayName' ? sortConfig.direction : false}
                      onSort={() => handleSort('displayName')}
                      className="min-w-0 w-1/4"
                    >
                      Name
                    </Table.HeaderCell>
                    
                    <Table.HeaderCell className="min-w-0 w-1/3">
                      Description
                    </Table.HeaderCell>
                    
                    <Table.HeaderCell
                      sortable
                      sorted={sortConfig.key === 'created' ? sortConfig.direction : false}
                      onSort={() => handleSort('created')}
                      className="w-32 whitespace-nowrap"
                    >
                      Created
                    </Table.HeaderCell>
                    
                    <Table.HeaderCell
                      sortable
                      sorted={sortConfig.key === 'lastUpdated' ? sortConfig.direction : false}
                      onSort={() => handleSort('lastUpdated')}
                      className="w-32 whitespace-nowrap"
                    >
                      Last Updated
                    </Table.HeaderCell>
                    
                    <Table.HeaderCell className="w-24 text-center">
                      Quality
                    </Table.HeaderCell>
                    
                    <Table.HeaderCell className="w-20 text-center">
                      <span className="sr-only">Actions</span>
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                
                <Table.Body>
                  {data.map(({ metadata, quality }) => (
                    <Table.Row key={metadata.id}>
                      <Table.Cell className="min-w-0">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {metadata.displayName || metadata.name}
                          </div>
                          {metadata.code && (
                            <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                              {metadata.code}
                            </div>
                          )}
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell className="min-w-0">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {metadata.description
                            ? metadata.description
                            : (
                              <span className="text-gray-400 italic">
                                No description
                              </span>
                            )
                          }
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell className="whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(metadata.created)}
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell className="whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(metadata.lastUpdated)}
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell className="text-center">
                        <QualityBadge score={quality.qualityScore} size="sm" />
                      </Table.Cell>
                      
                      <Table.Cell className="text-center">
                        <Link href={`${basePath}/${metadata.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
        )}
      </div>
      
      {!isLoading && renderPagination()}
    </div>
  );
}; 