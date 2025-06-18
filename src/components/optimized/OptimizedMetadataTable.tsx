import React, { memo, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { QualityBadge } from '@/components/features/metadata/QualityBadge';
import { BaseMetadata, MetadataWithQuality, MetadataFilter } from '@/types/metadata';
import { formatDate, truncateText } from '@/lib/utils';

interface OptimizedMetadataTableProps<T extends BaseMetadata> {
  data: MetadataWithQuality<T>[];
  basePath: string;
  isLoading?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onSortChange: (field: keyof T, direction: 'asc' | 'desc') => void;
  sortField?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

// Memoized table row component to prevent unnecessary re-renders
const TableRow = memo<{
  item: MetadataWithQuality<BaseMetadata>;
  basePath: string;
  style: React.CSSProperties;
}>(({ item, basePath, style }) => (
  <div
    style={style}
    className="flex items-center px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <Link
            href={`${basePath}/${item.metadata.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium truncate block"
          >
            {item.metadata.displayName || item.metadata.name}
          </Link>
          {item.metadata.code && (
            <p className="text-sm text-gray-500 truncate">{item.metadata.code}</p>
          )}
        </div>
        <div className="flex items-center space-x-3 ml-4">
          <QualityBadge assessment={item.quality} />
          <span className="text-xs text-gray-400">
            {formatDate(item.metadata.lastUpdated)}
          </span>
        </div>
      </div>
      {item.metadata.description && (
        <p className="text-sm text-gray-600 mt-1">
          {truncateText(item.metadata.description, 100)}
        </p>
      )}
    </div>
  </div>
));

TableRow.displayName = 'TableRow';

function OptimizedMetadataTableComponent<T extends BaseMetadata>({
  data,
  basePath,
  isLoading = false,
  pagination,
  onPageChange,
  onSortChange,
  sortField,
  sortDirection = 'asc',
}: OptimizedMetadataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualize the table for large datasets
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5, // Render 5 extra items outside viewport
  });

  // Memoize sort handler
  const handleSort = useCallback(
    (field: keyof T) => {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    },
    [onSortChange, sortField, sortDirection]
  );

  // Memoize pagination controls
  const paginationControls = useMemo(() => {
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);
    const pages = [];

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }, [pagination.page, pagination.totalPages]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading metadata...</span>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No metadata items found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {pagination.total} items found
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('displayName' as keyof T)}
              className="text-xs"
            >
              Sort by Name
              {sortField === 'displayName' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('lastUpdated' as keyof T)}
              className="text-xs"
            >
              Sort by Date
              {sortField === 'lastUpdated' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="h-96 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <TableRow
              key={virtualItem.key}
              item={data[virtualItem.index]}
              basePath={basePath}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              
              {paginationControls.map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="min-w-10"
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export memoized component
export const OptimizedMetadataTable = memo(OptimizedMetadataTableComponent) as typeof OptimizedMetadataTableComponent;