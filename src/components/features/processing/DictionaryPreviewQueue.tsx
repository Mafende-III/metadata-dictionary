'use client';

import { useState } from 'react';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowPathIcon,
  StopIcon,
  EyeIcon,
  TableCellsIcon,
  DocumentTextIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

export interface DictionaryPreview {
  preview_id: string;
  dictionary_name: string;
  instance_id: string;
  instance_name: string;
  metadata_type: string;
  sql_view_id: string;
  group_id?: string;
  raw_data: any[];
  headers: string[];
  row_count: number;
  preview_count: number;
  status: 'loading' | 'ready' | 'converted' | 'saved' | 'error';
  execution_time?: number;
  created_at: string;
  error_message?: string;
  structured_data?: any[];
  detected_columns?: string[];
}

interface DictionaryPreviewQueueProps {
  previews: DictionaryPreview[];
  onTerminate?: (previewId: string) => void;
  onTerminateAll?: () => void;
  onViewJson?: (preview: DictionaryPreview) => void;
  onConvertToTable?: (preview: DictionaryPreview) => void;
  onSaveDictionary?: (preview: DictionaryPreview) => void;
  maxVisible?: number;
}

export default function DictionaryPreviewQueue({ 
  previews,
  onTerminate,
  onTerminateAll,
  onViewJson,
  onConvertToTable,
  onSaveDictionary,
  maxVisible = 10
}: DictionaryPreviewQueueProps) {
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<{ [key: string]: 'json' | 'table' }>({});

  const visiblePreviews = previews.slice(0, maxVisible);
  const hasActivePreviews = previews.some(p => p.status === 'loading' || p.status === 'ready');
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'ready':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'converted':
        return <TableCellsIcon className="h-4 w-4 text-purple-600" />;
      case 'saved':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 processing-pulse';
      case 'ready':
        return 'bg-yellow-50';
      case 'converted':
        return 'bg-purple-50';
      case 'saved':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      default:
        return '';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'loading': return 'default';
      case 'ready': return 'warning';
      case 'converted': return 'secondary';
      case 'saved': return 'success';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const toggleExpanded = (previewId: string) => {
    setExpandedPreview(expandedPreview === previewId ? null : previewId);
  };

  const toggleViewMode = (previewId: string) => {
    setViewMode(prev => ({
      ...prev,
      [previewId]: prev[previewId] === 'json' ? 'table' : 'json'
    }));
  };

  const detectColumns = (data: any[]): string[] => {
    if (!data || data.length === 0) return [];
    
    const allKeys = new Set<string>();
    data.slice(0, 5).forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    });
    
    return Array.from(allKeys);
  };

  const renderJsonDisplay = (preview: DictionaryPreview) => {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-700">Raw JSON Data</h4>
          <div className="flex space-x-2">
            <Button
              onClick={() => toggleViewMode(preview.preview_id)}
              variant="outline"
              size="sm"
            >
              {viewMode[preview.preview_id] === 'table' ? (
                <>
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  View JSON
                </>
              ) : (
                <>
                  <TableCellsIcon className="h-4 w-4 mr-1" />
                  View Table
                </>
              )}
            </Button>
            {preview.status === 'ready' && onConvertToTable && (
              <Button
                onClick={() => onConvertToTable(preview)}
                variant="outline"
                size="sm"
                className="bg-purple-50 hover:bg-purple-100 text-purple-600"
              >
                <TableCellsIcon className="h-4 w-4 mr-1" />
                Convert to Table
              </Button>
            )}
          </div>
        </div>
        
        {viewMode[preview.preview_id] === 'table' ? (
          <div className="max-h-96 overflow-auto">
            {renderTableView(preview)}
          </div>
        ) : (
          <div className="max-h-96 overflow-auto">
            <pre className="text-xs bg-white p-3 rounded border">
              {JSON.stringify(preview.raw_data.slice(0, 3), null, 2)}
              {preview.raw_data.length > 3 && (
                <div className="text-gray-500 mt-2">
                  ... and {preview.raw_data.length - 3} more rows
                </div>
              )}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderTableView = (preview: DictionaryPreview) => {
    const data = preview.structured_data || preview.raw_data;
    const columns = preview.detected_columns || detectColumns(data);
    
    if (!data || data.length === 0) {
      return <div className="text-gray-500 text-center py-4">No data to display</div>;
    }

    return (
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table className="w-full">
          <Table.Head>
            <Table.Row isHeader>
              {columns.map((column, index) => (
                <Table.HeaderCell key={index}>{column}</Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {data.slice(0, 10).map((row, rowIndex) => (
              <Table.Row key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <Table.Cell key={colIndex}>
                    <div className="max-w-xs truncate" title={String(row[column] || '')}>
                      {String(row[column] || '')}
                    </div>
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {data.length > 10 && (
          <div className="p-2 bg-gray-50 text-center text-sm text-gray-600">
            Showing 10 of {data.length} rows
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dictionary Preview Queue</h3>
        {hasActivePreviews && onTerminateAll && (
          <Button
            onClick={onTerminateAll}
            variant="outline"
            size="sm"
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 flex items-center space-x-2"
          >
            <StopIcon className="h-4 w-4" />
            <span>Terminate All</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visiblePreviews.map((preview) => (
          <Card key={preview.preview_id} className={`p-4 ${getRowClass(preview.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(preview.status)}
                <div>
                  <h4 className="font-medium">{preview.dictionary_name}</h4>
                  <div className="text-sm text-gray-600">
                    {preview.instance_name} • {preview.metadata_type} • {preview.preview_count} rows
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={getBadgeVariant(preview.status)} className="text-xs">
                  {preview.status.charAt(0).toUpperCase() + preview.status.slice(1)}
                </Badge>

                {preview.execution_time && (
                  <span className="text-xs text-gray-500">
                    {(preview.execution_time / 1000).toFixed(2)}s
                  </span>
                )}

                <div className="flex space-x-1">
                  <Button
                    onClick={() => toggleExpanded(preview.preview_id)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>

                  {preview.status === 'converted' && onSaveDictionary && (
                    <Button
                      onClick={() => onSaveDictionary(preview)}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 hover:bg-green-100 text-green-600"
                    >
                      <BookmarkIcon className="h-4 w-4 mr-1" />
                      Save Dictionary
                    </Button>
                  )}

                  {(preview.status === 'loading' || preview.status === 'ready') && onTerminate && (
                    <Button
                      onClick={() => onTerminate(preview.preview_id)}
                      variant="outline"
                      size="sm"
                      className="bg-red-50 hover:bg-red-100 text-red-600"
                    >
                      <StopIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {preview.error_message && (
              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                {preview.error_message}
              </div>
            )}

            {expandedPreview === preview.preview_id && preview.status !== 'loading' && (
              renderJsonDisplay(preview)
            )}
          </Card>
        ))}
      </div>

      {previews.length > maxVisible && (
        <p className="text-sm text-gray-500 text-center">
          Showing {maxVisible} of {previews.length} previews
        </p>
      )}
    </div>
  );
} 