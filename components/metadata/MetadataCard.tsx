import { ReactNode } from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { QualityBadge } from './QualityBadge';
import { BaseMetadata, QualityAssessment } from '../../types/metadata';
import { truncateText, formatDate, timeAgo } from '../../lib/utils';

interface MetadataCardProps<T extends BaseMetadata> {
  metadata: T;
  qualityAssessment: QualityAssessment;
  basePath: string;
  children?: ReactNode;
}

export const MetadataCard = <T extends BaseMetadata>({
  metadata,
  qualityAssessment,
  basePath,
  children,
}: MetadataCardProps<T>) => {
  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
            {metadata.displayName || metadata.name}
          </h3>
          
          {metadata.code && (
            <p className="text-sm text-gray-500 mt-1">
              Code: <span className="font-mono">{metadata.code}</span>
            </p>
          )}
        </div>
        
        <QualityBadge score={qualityAssessment.qualityScore} />
      </div>
      
      <div className="mt-2">
        {metadata.description ? (
          <p className="text-sm text-gray-600 line-clamp-3">
            {truncateText(metadata.description, 150)}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No description available
          </p>
        )}
      </div>
      
      {children && <div className="mt-3">{children}</div>}
      
      <div className="mt-4 text-xs text-gray-500 flex justify-between">
        <div>
          Created: {formatDate(metadata.created)}
        </div>
        <div>
          Updated: {timeAgo(metadata.lastUpdated)}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
        <Link href={`${basePath}/${metadata.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}; 