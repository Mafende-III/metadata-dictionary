import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ExportFormat, ExportOptions } from '@/lib/export';

interface ExportButtonProps {
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  disabled?: boolean;
  isBulk?: boolean;
  dictionaryName?: string;
  instanceUrl?: string;
}

export const ExportButton = ({
  onExport,
  disabled = false,
  isBulk = false,
  dictionaryName,
  instanceUrl,
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.JSON);
  const [options, setOptions] = useState<ExportOptions>({
    format: ExportFormat.JSON,
    includeQuality: true,
    includeDescription: true,
    includeApiUrls: true,
    pythonLibrary: 'requests',
    apiUrlFormat: 'full'
  });
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Handle simple export (for basic formats)
  const handleSimpleExport = (format: ExportFormat) => {
    const exportOptions: ExportOptions = {
      ...options,
      format
    };
    onExport(format, exportOptions);
    closeDropdown();
  };
  
  // Handle advanced export (opens modal for configuration)
  const handleAdvancedExport = (format: ExportFormat) => {
    setSelectedFormat(format);
    setOptions(prev => ({ ...prev, format }));
    setShowAdvancedModal(true);
    closeDropdown();
  };
  
  // Execute export with advanced options
  const executeAdvancedExport = () => {
    onExport(selectedFormat, options);
    setShowAdvancedModal(false);
  };
  
  const exportFormats = [
    {
      format: ExportFormat.JSON,
      label: '📄 Export as JSON',
      description: 'Standard JSON format',
      isAdvanced: false
    },
    {
      format: ExportFormat.CSV,
      label: '📊 Export as CSV',
      description: 'Spreadsheet compatible format',
      isAdvanced: false
    },
    {
      format: ExportFormat.PYTHON,
      label: '🐍 Generate Python Code',
      description: 'Ready-to-use Python integration code',
      isAdvanced: true
    },
    {
      format: ExportFormat.JUPYTER,
      label: '📓 Generate Jupyter Notebook',
      description: 'Interactive analysis notebook',
      isAdvanced: true
    },
    {
      format: ExportFormat.API_LINKS,
      label: '🔗 Export API Links',
      description: 'List of DHIS2 API endpoints',
      isAdvanced: true
    }
  ];
  
  return (
    <>
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
            <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Export Options</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={options.includeQuality}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeQuality: e.target.checked }))}
                      />
                      <span className="ml-2 text-sm text-gray-700">Include quality scores</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={options.includeDescription}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeDescription: e.target.checked }))}
                      />
                      <span className="ml-2 text-sm text-gray-700">Include descriptions</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={options.includeApiUrls}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeApiUrls: e.target.checked }))}
                      />
                      <span className="ml-2 text-sm text-gray-700">Include API URLs</span>
                    </label>
                  </div>
                </div>
                
                {/* Export format options */}
                <div className="max-h-64 overflow-y-auto">
                  {exportFormats.map(({ format, label, description, isAdvanced }) => (
                    <button
                      key={format}
                      className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                      onClick={() => isAdvanced ? handleAdvancedExport(format) : handleSimpleExport(format)}
                      role="menuitem"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-xs text-gray-500 mt-1">{description}</div>
                        </div>
                        {isAdvanced && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Advanced
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    💡 Advanced options generate ready-to-use code and analysis tools
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Advanced Export Configuration Modal */}
      {showAdvancedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedFormat === ExportFormat.PYTHON && '🐍 Python Code Configuration'}
                {selectedFormat === ExportFormat.JUPYTER && '📓 Jupyter Notebook Configuration'}
                {selectedFormat === ExportFormat.API_LINKS && '🔗 API Links Configuration'}
              </h2>
              <button
                onClick={() => setShowAdvancedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedFormat === ExportFormat.PYTHON && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Python Library
                  </label>
                  <select
                    value={options.pythonLibrary}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      pythonLibrary: e.target.value as 'requests' | 'dhis2.py' | 'pandas'
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="requests">requests (most common)</option>
                    <option value="pandas">pandas (data analysis)</option>
                    <option value="dhis2.py">dhis2.py (official SDK)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the Python library style for generated code
                  </p>
                </div>
              )}

              {selectedFormat === ExportFormat.API_LINKS && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Format
                  </label>
                  <select
                    value={options.apiUrlFormat}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      apiUrlFormat: e.target.value as 'full' | 'relative' | 'list'
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="full">Full URLs with metadata</option>
                    <option value="relative">Relative paths only</option>
                    <option value="list">Simple URL list</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose how API URLs should be formatted
                  </p>
                </div>
              )}

              {/* Common options for all advanced formats */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Include in Export:</h3>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    checked={options.includeQuality}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeQuality: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-700">Quality scores</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    checked={options.includeDescription}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeDescription: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-700">Descriptions</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    checked={options.includeApiUrls}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeApiUrls: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-700">API URLs</span>
                </label>
              </div>

              {/* Info about what will be generated */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">What you'll get:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  {selectedFormat === ExportFormat.PYTHON && (
                    <>
                      <li>• Complete Python class for DHIS2 API access</li>
                      <li>• Functions for data fetching and bulk operations</li>
                      <li>• Example usage and error handling</li>
                      <li>• Ready to run in your Python environment</li>
                    </>
                  )}
                  {selectedFormat === ExportFormat.JUPYTER && (
                    <>
                      <li>• Interactive Jupyter notebook (.ipynb)</li>
                      <li>• Data visualization examples</li>
                      <li>• Quality analysis and statistics</li>
                      <li>• Editable code cells for custom analysis</li>
                    </>
                  )}
                  {selectedFormat === ExportFormat.API_LINKS && (
                    <>
                      <li>• Complete list of DHIS2 API endpoints</li>
                      <li>• Metadata annotations and descriptions</li>
                      <li>• Quality scores for each variable</li>
                      <li>• Ready for use in external tools</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <Button
                onClick={executeAdvancedExport}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Generate & Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};