'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StopIcon } from '@heroicons/react/24/outline';

interface ProcessingStatsProps {
  avgProcessTime: number;
  successRate: number;
  itemsPerMinute: number;
  remainingTime: string;
  onTerminate?: () => void;
  isProcessing?: boolean;
}

export default function ProcessingStats({ 
  avgProcessTime, 
  successRate, 
  itemsPerMinute, 
  remainingTime,
  onTerminate,
  isProcessing = false
}: ProcessingStatsProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Processing Statistics</h3>
        {isProcessing && onTerminate && (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {avgProcessTime.toFixed(1)}s
          </div>
          <div className="text-sm text-gray-600">Avg. Process Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {successRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {Math.floor(itemsPerMinute)}
          </div>
          <div className="text-sm text-gray-600">Items/Minute</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {remainingTime}
          </div>
          <div className="text-sm text-gray-600">Est. Remaining</div>
        </div>
      </div>
    </Card>
  );
}