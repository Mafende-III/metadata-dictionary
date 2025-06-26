'use client';

import { Card } from '@/components/ui/Card';

interface ProcessingStatsProps {
  avgProcessTime: number;
  successRate: number;
  itemsPerMinute: number;
  remainingTime: string;
}

export default function ProcessingStats({ 
  avgProcessTime, 
  successRate, 
  itemsPerMinute, 
  remainingTime 
}: ProcessingStatsProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Processing Statistics</h3>
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