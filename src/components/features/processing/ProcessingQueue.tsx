'use client';

import { useState } from 'react';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowPathIcon,
  StopIcon
} from '@heroicons/react/24/outline';

export interface QueueItem {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  processingTime?: number;
  quality?: number;
  error?: string;
}

interface ProcessingQueueProps {
  items: QueueItem[];
  maxVisible?: number;
  onTerminate?: () => void;
  isProcessing?: boolean;
  onGenerateDictionary?: () => void;
}

export default function ProcessingQueue({ 
  items, 
  maxVisible = 20, // Items per page
  onTerminate,
  isProcessing = false,
  onGenerateDictionary
}: ProcessingQueueProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(maxVisible);
  
  // Calculate pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleItems = items.slice(startIndex, endIndex);
  
  const hasActiveProcessing = items.some(item => item.status === 'processing') || isProcessing;
  
  // Calculate completion stats
  const totalItems = items.length;
  const completedItems = items.filter(item => item.status === 'success' || item.status === 'error').length;
  const successItems = items.filter(item => item.status === 'success').length;
  const errorItems = items.filter(item => item.status === 'error').length;
  const processingItems = items.filter(item => item.status === 'processing').length;
  const pendingItems = items.filter(item => item.status === 'pending').length;
  
  const isComplete = !hasActiveProcessing && completedItems === totalItems && totalItems > 0;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 processing-pulse';
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      default:
        return '';
    }
  };

  const getBadgeVariant = (quality?: number) => {
    if (!quality) return 'secondary';
    if (quality > 80) return 'success';
    if (quality > 60) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Processing Queue & Results</h3>
        {hasActiveProcessing && onTerminate && (
          <Button
            onClick={onTerminate}
            variant="outline"
            size="sm"
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 flex items-center space-x-2"
          >
            <StopIcon className="h-4 w-4" />
            <span>Terminate</span>
          </Button>
        )}
      </div>

      {/* Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedItems} of {totalItems} items
          </span>
          <span className="text-sm font-medium text-gray-700">
            {completionPercentage}% Complete
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Status Summary */}
        <div className="flex items-center space-x-4 text-sm">
          {pendingItems > 0 && (
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{pendingItems} pending</span>
            </div>
          )}
          {processingItems > 0 && (
            <div className="flex items-center space-x-1">
              <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-blue-600">{processingItems} processing</span>
            </div>
          )}
          {successItems > 0 && (
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-600">{successItems} success</span>
            </div>
          )}
          {errorItems > 0 && (
            <div className="flex items-center space-x-1">
              <XCircleIcon className="h-4 w-4 text-red-600" />
              <span className="text-red-600">{errorItems} errors</span>
            </div>
          )}
        </div>
        
        {/* Completion Message */}
        {isComplete && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  ✅ Processing Complete! 
                  {successItems > 0 && ` ${successItems} items processed successfully.`}
                  {errorItems > 0 && ` ${errorItems} items had errors.`}
                </span>
              </div>
              {onGenerateDictionary && successItems > 0 && (
                <Button
                  onClick={onGenerateDictionary}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Generate Dictionary
                </Button>
              )}
            </div>
            <div className="mt-2 text-sm text-green-700">
              📋 Click "Generate Dictionary" to create dictionary from the processed results.
            </div>
          </div>
        )}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table className="w-full">
          <Table.Head>
            <Table.Row isHeader>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>UID</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Quality</Table.HeaderCell>
              <Table.HeaderCell>Processing Time</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {visibleItems.map((item) => (
              <Table.Row key={item.id} className={getRowClass(item.status)}>
                <Table.Cell>
                  <div className="flex justify-center">
                    {getStatusIcon(item.status)}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-medium">{item.name}</span>
                </Table.Cell>
                <Table.Cell>
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {item.id}
                  </code>
                </Table.Cell>
                <Table.Cell>{item.type}</Table.Cell>
                <Table.Cell>
                  {item.quality ? (
                    <Badge 
                      variant={getBadgeVariant(item.quality)}
                      className="text-xs"
                    >
                      {item.quality}%
                    </Badge>
                  ) : null}
                </Table.Cell>
                <Table.Cell>
                  {item.processingTime 
                    ? `${(item.processingTime / 1000).toFixed(2)}s`
                    : item.status === 'processing' 
                    ? 'Processing...' 
                    : '-'}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-4 bg-gray-50 border-t">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="text-xs w-8 h-8"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}