import { useState } from 'react';
import { Button } from '../ui/Button';
import { ExportFormat } from '../../lib/export';

interface ExportButtonProps {
  onExport: (format: ExportFormat, includeQuality: boolean) => void;
  disabled?: boolean;
  isBulk?: boolean;
}

export const ExportButton = ({
  onExport,
  disabled = false,
  isBulk = false,
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [includeQuality, setIncludeQuality] = useState(true);
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Handle export click
  const handleExport = (format: ExportFormat) => {
    onExport(format, includeQuality);
    closeDropdown();
  };
  
  return (
    <div className="relative inline-block text-left">
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={toggleDropdown}
          disabled={disabled}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        >
          {isBulk ? 'Export Selected' : 'Export'}
        </Button>
      </div>
      
      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={closeDropdown}
          ></div>
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
              <div className="px-4 py-2 border-b border-gray-100">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    checked={includeQuality}
                    onChange={(e) => setIncludeQuality(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">Include quality data</span>
                </label>
              </div>
              
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => handleExport(ExportFormat.JSON)}
                role="menuitem"
              >
                Export as JSON
              </button>
              
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => handleExport(ExportFormat.CSV)}
                role="menuitem"
              >
                Export as CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};