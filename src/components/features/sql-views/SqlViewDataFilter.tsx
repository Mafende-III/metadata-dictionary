'use client';

import { useState } from 'react';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';

interface SqlViewDataFilterProps {
  templateId: string;
  onFilterChange: (filters: Record<string, any>) => void;
  currentFilters: Record<string, any>;
}

export default function SqlViewDataFilter({
  templateId,
  onFilterChange,
  currentFilters = {}
}: SqlViewDataFilterProps) {
  const { templates } = useAdminSqlViewStore();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return <div className="text-sm text-red-500">Template not found</div>;
  }
  
  // Extract potential filter fields from the SQL query
  // This is a simplified approach; in a real implementation,
  // you might want to define filter fields in the template definition
  const getFilterFields = () => {
    // Look for parameters in the SQL query with pattern ${parameter}
    const parameterRegex = /\${([a-zA-Z0-9_]+)}/g;
    const matches = [...template.sqlQuery.matchAll(parameterRegex)];
    return matches.map(match => match[1]);
  };
  
  const filterFields = getFilterFields();
  
  // If no filter fields are detected, show a simple message
  if (filterFields.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-3 border rounded bg-gray-50">
        No filter parameters available for this SQL view
      </div>
    );
  }
  
  return (
    <div className="border rounded p-4 mb-4">
      <h3 className="text-sm font-semibold mb-3">Filter SQL View Data</h3>
      
      <div className="space-y-3">
        {filterFields.map(field => (
          <div key={field} className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">{field}</label>
            <input
              type="text"
              value={currentFilters[field] || ''}
              onChange={(e) => {
                onFilterChange({
                  ...currentFilters,
                  [field]: e.target.value
                });
              }}
              className="border rounded px-2 py-1 text-sm"
              placeholder={`Enter ${field}`}
            />
          </div>
        ))}
      </div>
      
      {filterFields.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onFilterChange({})}
            className="text-xs text-gray-600 hover:text-gray-800 mr-3"
          >
            Reset
          </button>
          <button
            onClick={() => onFilterChange(currentFilters)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
} 