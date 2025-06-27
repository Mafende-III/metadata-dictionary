import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, Database, Globe, FileText, Activity } from 'lucide-react';

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'loading';
  dhis2: 'connected' | 'disconnected' | 'loading';
  apis: 'working' | 'error' | 'loading';
  processing: number; // Number of active processes
  lastUpdate: Date;
}

interface SystemHealth {
  instances: number;
  sqlViews: number;
  dictionaries: number;
  version: string;
}

export const SystemStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    database: 'loading',
    dhis2: 'loading', 
    apis: 'loading',
    processing: 0,
    lastUpdate: new Date()
  });

  const [health, setHealth] = useState<SystemHealth>({
    instances: 0,
    sqlViews: 0,
    dictionaries: 0,
    version: 'Unknown'
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Check system status
  const checkSystemStatus = async () => {
    try {
      // Check database connection
      const instancesResponse = await fetch('/api/instances');
      const instancesData = await instancesResponse.json();
      
      setStatus(prev => ({
        ...prev,
        database: instancesResponse.ok ? 'connected' : 'disconnected'
      }));

      if (instancesResponse.ok && instancesData.length > 0) {
        // Check DHIS2 connection with first instance
        const testResponse = await fetch('/api/dhis2/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverUrl: instancesData[0].base_url,
            username: instancesData[0].username,
            password: 'test' // This will fail but we just want to check API
          })
        });

        setStatus(prev => ({
          ...prev,
          dhis2: testResponse.ok ? 'connected' : 'disconnected',
          apis: 'working',
          lastUpdate: new Date()
        }));

        // Update health metrics
        setHealth({
          instances: instancesData.length,
          sqlViews: instancesData.reduce((sum: number, inst: any) => sum + (inst.sql_views_count || 0), 0),
          dictionaries: instancesData.reduce((sum: number, inst: any) => sum + (inst.dictionaries_count || 0), 0),
          version: instancesData[0]?.version || 'Unknown'
        });
      }
    } catch (error) {
      console.error('System status check failed:', error);
      setStatus(prev => ({
        ...prev,
        database: 'disconnected',
        dhis2: 'disconnected',
        apis: 'error',
        lastUpdate: new Date()
      }));
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get status color and icon
  const getStatusDisplay = (statusType: string, value: string) => {
    switch (value) {
      case 'connected':
      case 'working':
        return { color: 'text-green-500', bg: 'bg-green-100', icon: CheckCircle };
      case 'disconnected':
      case 'error':
        return { color: 'text-red-500', bg: 'bg-red-100', icon: AlertCircle };
      case 'loading':
      default:
        return { color: 'text-yellow-500', bg: 'bg-yellow-100', icon: Clock };
    }
  };

  const overallStatus = status.database === 'connected' && 
                       status.dhis2 === 'connected' && 
                       status.apis === 'working' ? 'healthy' : 'warning';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact Status Indicator */}
      <div 
        className={`cursor-pointer transition-all duration-300 ${
          isExpanded ? 'mb-4' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`
          flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg border
          ${overallStatus === 'healthy' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }
        `}>
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium">
            {overallStatus === 'healthy' ? 'System Healthy' : 'System Issues'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            overallStatus === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
        </div>
      </div>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">System Status</h3>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Status Items */}
          <div className="space-y-3">
            {/* Database Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Database</span>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                getStatusDisplay('database', status.database).bg
              }`}>
                {React.createElement(getStatusDisplay('database', status.database).icon, {
                  className: `w-3 h-3 ${getStatusDisplay('database', status.database).color}`
                })}
                <span className={getStatusDisplay('database', status.database).color}>
                  {status.database}
                </span>
              </div>
            </div>

            {/* DHIS2 Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">DHIS2</span>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                getStatusDisplay('dhis2', status.dhis2).bg
              }`}>
                {React.createElement(getStatusDisplay('dhis2', status.dhis2).icon, {
                  className: `w-3 h-3 ${getStatusDisplay('dhis2', status.dhis2).color}`
                })}
                <span className={getStatusDisplay('dhis2', status.dhis2).color}>
                  {status.dhis2}
                </span>
              </div>
            </div>

            {/* APIs Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">APIs</span>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                getStatusDisplay('apis', status.apis).bg
              }`}>
                {React.createElement(getStatusDisplay('apis', status.apis).icon, {
                  className: `w-3 h-3 ${getStatusDisplay('apis', status.apis).color}`
                })}
                <span className={getStatusDisplay('apis', status.apis).color}>
                  {status.apis}
                </span>
              </div>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-600 mb-2">System Health</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-medium text-blue-700">{health.instances}</div>
                <div className="text-blue-600">Instances</div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-700">{health.sqlViews}</div>
                <div className="text-green-600">SQL Views</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="font-medium text-purple-700">{health.dictionaries}</div>
                <div className="text-purple-600">Dictionaries</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-700">{health.version}</div>
                <div className="text-gray-600">Version</div>
              </div>
            </div>
          </div>

          {/* Last Update */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Last updated: {status.lastUpdate.toLocaleTimeString()}
            </div>
            <button 
              onClick={checkSystemStatus}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 