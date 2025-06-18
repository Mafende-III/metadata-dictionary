'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Table } from 'lucide-react';
import { SqlViewDataTable } from '@/components/features/sql-views';

interface DebugTableGeneratorProps {
  className?: string;
}

export default function DebugTableGenerator({ className = '' }: DebugTableGeneratorProps) {
  const [debugTableData, setDebugTableData] = useState<any[]>([]);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(true);

  // Listen for debug table generation events
  useEffect(() => {
    const handleGenerateTable = (event: CustomEvent) => {
      const { processedData, rowCount } = event.detail;
      console.log('🎯 DebugTableGenerator: Received data:', { rowCount, processedData });
      
      if (processedData && Array.isArray(processedData) && processedData.length > 0) {
        setDebugTableData(processedData);
        setShowTable(true);
      }
    };

    if (isListening) {
      window.addEventListener('generateTableFromDebugData', handleGenerateTable as EventListener);
    }
    
    return () => {
      window.removeEventListener('generateTableFromDebugData', handleGenerateTable as EventListener);
    };
  }, [isListening]);

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setShowTable(false);
      setDebugTableData([]);
    }
  };

  const clearTable = () => {
    setDebugTableData([]);
    setShowTable(false);
  };

  return (
    <div className={`${className}`}>
      {/* Control Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900">Debug Table Generator</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                {isListening ? 'Listening for JSON data' : 'Not listening'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                isListening 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isListening ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
            {debugTableData.length > 0 && (
              <button
                onClick={clearTable}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear Table
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generated Table */}
      {showTable && debugTableData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-gray-900">
                Generated Table from Debug JSON
              </h3>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                {debugTableData.length} rows
              </span>
            </div>
            <button
              onClick={() => setShowTable(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
          
          <SqlViewDataTable
            data={debugTableData}
            headers={debugTableData.length > 0 ? Object.keys(debugTableData[0]) : []}
            loading={false}
            pageSize={50}
            showExport={true}
            showFilter={true}
            showPagination={true}
          />
        </div>
      )}

      {/* Instructions */}
      {!showTable && isListening && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to Generate Table:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Use the SQL View Debug component to fetch JSON data</li>
            <li>2. When data is returned, click the "Generate Table" button</li>
            <li>3. The table will appear here with interactive features</li>
            <li>4. Use filters, sorting, and export as needed</li>
          </ol>
        </div>
      )}
    </div>
  );
}