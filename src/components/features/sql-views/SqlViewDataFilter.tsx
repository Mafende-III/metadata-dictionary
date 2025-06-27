'use client';

import { useState, useEffect } from 'react';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';

interface SqlViewDataFilterProps {
  templateId: string;
  onFilterChange: (filters: Record<string, any>) => void;
  currentFilters: Record<string, any>;
  disabled?: boolean;
}

export default function SqlViewDataFilter({
  templateId,
  onFilterChange,
  currentFilters = {},
  disabled = false
}: SqlViewDataFilterProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(currentFilters);
  const { templates } = useAdminSqlViewStore();
  const template = templates.find(t => t.id === templateId);
  
  // Update local filters when current filters change
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);
  
  if (!template) {
    return <div className="text-sm text-red-500">Template not found</div>;
  }
  
  // Extract potential filter fields from the SQL query
  const getFilterFields = () => {
    // Look for parameters in the SQL query with pattern ${parameter}
    const parameterRegex = /\${([a-zA-Z0-9_]+)}/g;
    const matches = [...template.sqlQuery.matchAll(parameterRegex)];
    return matches.map(match => match[1]);
  };
  
  const filterFields = getFilterFields();
  
  // If no filter fields are detected, don't show the filter component at all
  if (filterFields.length === 0) {
    return null;
  }
  
  // Check if any filters have values
  const hasActiveFilters = Object.values(localFilters).some(value => value && value.toString().trim() !== '');
  
  return (
    <div className="border rounded p-4 mb-4 bg-gray-50">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">
        Optional SQL View Filters
        <span className="text-xs text-gray-500 ml-2">
          ({filterFields.length} parameter{filterFields.length !== 1 ? 's' : ''} available)
        </span>
      </h3>
      
      <div className="space-y-3">
        {filterFields.map(field => (
          <div key={field} className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1 flex items-center">
              {field}
              <span className="ml-1 text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={localFilters[field] || ''}
              onChange={(e) => {
                setLocalFilters(prev => ({
                  ...prev,
                  [field]: e.target.value
                }));
              }}
              disabled={disabled}
              className="border rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={`Enter ${field} (leave empty to ignore)`}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {hasActiveFilters ? 'Filters ready to apply' : 'No filters set - SQL view will run normally'}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setLocalFilters({});
              onFilterChange({});
            }}
            disabled={disabled || !hasActiveFilters}
            className="text-xs text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            onClick={() => onFilterChange(localFilters)}
            disabled={disabled}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {hasActiveFilters ? 'Apply Filters' : 'Execute Without Filters'}
          </button>
        </div>
      </div>
      
      {hasActiveFilters && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <span className="text-blue-700 font-medium">Active filters:</span>
          <div className="mt-1 space-y-1">
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || value.toString().trim() === '') return null;
              return (
                <div key={key} className="text-blue-600">
                  <span className="font-medium">{key}:</span> {value}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 