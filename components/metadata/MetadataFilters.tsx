import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { MetadataFilter } from '../../types/metadata';
import { QUALITY_LABELS } from '../../lib/constants';

interface MetadataFiltersProps {
  filters: MetadataFilter;
  onFilterChange: (filters: Partial<MetadataFilter>) => void;
  onReset: () => void;
  groupOptions?: Array<{ id: string; name: string }>;
  typeOptions?: Array<{ id: string; name: string }>;
}

export const MetadataFilters = ({
  filters,
  onFilterChange,
  onReset,
  groupOptions = [],
  typeOptions = [],
}: MetadataFiltersProps) => {
  // Local state for form
  const [searchInput, setSearchInput] = useState(filters.search || '');
  
  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search: searchInput });
  };
  
  // Handle group filter change
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({ group: selectedOptions });
  };
  
  // Handle type filter change
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    onFilterChange({ type: selectedOptions });
  };
  
  // Handle quality filter change
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
    onFilterChange({ qualityScore: selectedOptions });
  };
  
  return (
    <div className="bg-white p-4 shadow rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
      
      {/* Search filter */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex">
          <Input
            type="text"
            placeholder="Search metadata..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-grow"
            icon={
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
          <Button type="submit" className="ml-2">
            Search
          </Button>
        </div>
      </form>
      
      <div className="space-y-4">
        {/* Group filter */}
        {groupOptions.length > 0 && (
          <div>
            <label htmlFor="group-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Group
            </label>
            <select
              id="group-filter"
              multiple
              value={filters.group || []}
              onChange={handleGroupChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              size={Math.min(4, groupOptions.length)}
            >
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple options</p>
          </div>
        )}
        
        {/* Type filter */}
        {typeOptions.length > 0 && (
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              id="type-filter"
              multiple
              value={filters.type || []}
              onChange={handleTypeChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              size={Math.min(4, typeOptions.length)}
            >
              {typeOptions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple options</p>
          </div>
        )}
        
        {/* Quality filter */}
        <div>
          <label htmlFor="quality-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Quality Score
          </label>
          <select
            id="quality-filter"
            multiple
            value={filters.qualityScore?.map(String) || []}
            onChange={handleQualityChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            size={5}
          >
            {Object.entries(QUALITY_LABELS).map(([score, label]) => (
              <option key={score} value={score}>
                {label} ({score}/4)
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple options</p>
        </div>
        
        {/* Reset filters button */}
        <div className="pt-4">
          <Button variant="outline" onClick={onReset} fullWidth>
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}; 