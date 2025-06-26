'use client';

import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowPathIcon
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
}

export default function ProcessingQueue({ items, maxVisible = 10 }: ProcessingQueueProps) {
  const visibleItems = items.slice(0, maxVisible);
  
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
      <h3 className="text-lg font-semibold">Processing Queue & Results</h3>
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
      {items.length > maxVisible && (
        <p className="text-sm text-gray-500 text-center">
          Showing {maxVisible} of {items.length} items
        </p>
      )}
    </div>
  );
}