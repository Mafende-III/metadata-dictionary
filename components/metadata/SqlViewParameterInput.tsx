'use client';

import { useState, useEffect } from 'react';
import { Calendar, Type, Hash, ToggleLeft, ToggleRight } from 'lucide-react';

interface SqlViewVariable {
  name: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

interface SqlViewParameterInputProps {
  sqlViewId: string;
  sqlQuery?: string;
  onParametersChange: (parameters: Record<string, string>) => void;
  disabled?: boolean;
  className?: string;
}

export default function SqlViewParameterInput({
  sqlViewId,
  sqlQuery = '',
  onParametersChange,
  disabled = false,
  className = ''
}: SqlViewParameterInputProps) {
  const [variables, setVariables] = useState<SqlViewVariable[]>([]);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract variables from SQL query
  useEffect(() => {
    if (sqlQuery) {
      const extractedVars = extractVariablesFromQuery(sqlQuery);
      setVariables(extractedVars);
    } else if (sqlViewId) {
      fetchSqlViewMetadata();
    }
  }, [sqlQuery, sqlViewId]);

  // Fetch SQL view metadata to get the query and extract variables
  const fetchSqlViewMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dhis2/sql-views?id=${sqlViewId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch SQL view metadata');
      }
      
      const metadata = await response.json();
      if (metadata.sqlQuery) {
        const extractedVars = extractVariablesFromQuery(metadata.sqlQuery);
        setVariables(extractedVars);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  };

  // Extract variables from SQL query using regex
  const extractVariablesFromQuery = (query: string): SqlViewVariable[] => {
    const variablePattern = /\$\{(\w+)\}/g;
    const foundVars: Set<string> = new Set();
    let match;

    while ((match = variablePattern.exec(query)) !== null) {
      foundVars.add(match[1]);
    }

    return Array.from(foundVars).map(varName => ({
      name: varName,
      type: inferVariableType(varName),
      required: true,
      description: `Parameter: ${varName}`
    }));
  };

  // Infer variable type from name patterns
  const inferVariableType = (varName: string): 'text' | 'number' | 'date' | 'boolean' => {
    const lowerName = varName.toLowerCase();
    
    if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('period')) {
      return 'date';
    }
    if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('id') || 
        lowerName.includes('year') || lowerName.includes('month')) {
      return 'number';
    }
    if (lowerName.includes('enabled') || lowerName.includes('active') || lowerName.includes('flag')) {
      return 'boolean';
    }
    return 'text';
  };

  // Handle parameter value change
  const handleParameterChange = (varName: string, value: string) => {
    const newParameters = {
      ...parameters,
      [varName]: value
    };
    setParameters(newParameters);
    onParametersChange(newParameters);
  };

  // Render input based on variable type
  const renderVariableInput = (variable: SqlViewVariable) => {
    const value = parameters[variable.name] || '';

    switch (variable.type) {
      case 'date':
        return (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              value={value}
              onChange={(e) => handleParameterChange(variable.name, e.target.value)}
              disabled={disabled}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="number"
              value={value}
              onChange={(e) => handleParameterChange(variable.name, e.target.value)}
              disabled={disabled}
              placeholder="Enter number..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleParameterChange(variable.name, value === 'true' ? 'false' : 'true')}
              disabled={disabled}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md border transition-colors ${
                value === 'true' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-gray-100 text-gray-700 border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
            >
              {value === 'true' ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              <span>{value === 'true' ? 'True' : 'False'}</span>
            </button>
          </div>
        );

      default:
        return (
          <div className="relative">
            <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={value}
              onChange={(e) => handleParameterChange(variable.name, e.target.value)}
              disabled={disabled}
              placeholder="Enter text..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-700 text-sm">Error loading parameters: {error}</p>
      </div>
    );
  }

  if (variables.length === 0) {
    return null; // No variables to display
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium text-blue-900 mb-3">SQL View Parameters</h3>
      <div className="space-y-4">
        {variables.map((variable) => (
          <div key={variable.name} className="space-y-1">
            <label className="block text-sm font-medium text-blue-800">
              {variable.name}
              {variable.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {variable.description && (
              <p className="text-xs text-blue-600 mb-1">{variable.description}</p>
            )}
            {renderVariableInput(variable)}
          </div>
        ))}
      </div>
      
      {variables.some(v => v.required) && (
        <p className="text-xs text-blue-600 mt-3">
          * Required parameters
        </p>
      )}
    </div>
  );
} 