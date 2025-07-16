import { accessLogger } from '@/lib/middleware/accessLogger';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function MonitoringPage() {
  const stats = await accessLogger.getAccessStats(24);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Access Monitoring</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Total Requests</h3>
            <p className="text-sm text-gray-600">Last 24 hours</p>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Unique Visitors</h3>
            <p className="text-sm text-gray-600">Unique IP addresses</p>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold">{stats.uniqueIPs}</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Avg Requests/IP</h3>
            <p className="text-sm text-gray-600">Per visitor</p>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold">
              {stats.uniqueIPs > 0 ? Math.round(stats.totalRequests / stats.uniqueIPs) : 0}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Top Pages</h3>
            <p className="text-sm text-gray-600">Most visited pages</p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {stats.topPages.map((page, index) => (
                <div key={page.url} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm">{page.url}</span>
                  <Badge>{page.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Requests</h3>
            <p className="text-sm text-gray-600">Last 50 requests</p>
          </div>
          <div className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.recentRequests.map((request, index) => (
                <div key={index} className="text-xs space-y-1 p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="font-mono">{request.ip}</span>
                    <span className="text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">{request.method}</span>
                    <span className="font-mono text-blue-600">
                      {new URL(request.url).pathname}
                    </span>
                  </div>
                  <div className="text-gray-600 truncate">
                    {request.userAgent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}