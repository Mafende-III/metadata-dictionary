'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

interface SavedMetadataEntry {
  id: string;
  name: string;
  description: string;
  sqlViewId: string;
  data: any[];
  metadata: {
    rowCount: number;
    executionTime: number;
    columns: string[];
  };
  savedAt: string;
  savedBy: string;
  category: string;
  tags: string[];
}

interface SavedMetadataManagerProps {
  category?: string;
  onLoad?: (entry: SavedMetadataEntry) => void;
}

export default function SavedMetadataManager({ 
  category = 'data_elements', 
  onLoad 
}: SavedMetadataManagerProps) {
  const { username } = useAuthStore();
  const [savedEntries, setSavedEntries] = useState<SavedMetadataEntry[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  // Load saved entries from localStorage on mount
  useEffect(() => {
    loadSavedEntries();
  }, [category]);

  const loadSavedEntries = () => {
    try {
      const saved = localStorage.getItem(`saved-metadata-${category}`);
      if (saved) {
        const entries = JSON.parse(saved);
        setSavedEntries(entries);
      } else {
        // Initialize with mock data for demonstration
        const mockEntries: SavedMetadataEntry[] = [
          {
            id: '1',
            name: 'Data Elements Analysis - Complete Dataset',
            description: 'All data elements with quality scores and metadata',
            sqlViewId: 'w1JM5arbLNJ',
            data: [],
            metadata: {
              rowCount: 1247,
              executionTime: 2345,
              columns: ['id', 'name', 'type', 'description', 'quality_score']
            },
            savedAt: '2024-03-15T10:30:00Z',
            savedBy: username || 'Demo User',
            category: 'data_elements',
            tags: ['complete', 'quality-assessed', 'multi-page']
          },
          {
            id: '2',
            name: 'Core Health Indicators - February Analysis',
            description: 'Filtered data elements for health domain analysis',
            sqlViewId: 'abc123def',
            data: [],
            metadata: {
              rowCount: 543,
              executionTime: 1876,
              columns: ['id', 'name', 'domain', 'frequency', 'quality']
            },
            savedAt: '2024-02-28T14:15:00Z',
            savedBy: username || 'Demo User',
            category: 'data_elements',
            tags: ['filtered', 'health-domain', 'february-2024']
          }
        ];
        setSavedEntries(mockEntries);
        localStorage.setItem(`saved-metadata-${category}`, JSON.stringify(mockEntries));
      }
    } catch (error) {
      console.error('Error loading saved entries:', error);
    }
  };

  const saveCurrentAnalysis = async (currentData?: any[], currentMetadata?: any, sqlViewId?: string) => {
    if (!saveName.trim()) {
      alert('Please enter a name for this analysis');
      return;
    }

    const newEntry: SavedMetadataEntry = {
      id: Date.now().toString(),
      name: saveName,
      description: saveDescription,
      sqlViewId: sqlViewId || 'unknown',
      data: currentData || [],
      metadata: {
        rowCount: currentData?.length || 0,
        executionTime: currentMetadata?.executionTime || 0,
        columns: currentMetadata?.columns || []
      },
      savedAt: new Date().toISOString(),
      savedBy: username || 'Current User',
      category,
      tags: []
    };

    const updatedEntries = [newEntry, ...savedEntries];
    setSavedEntries(updatedEntries);
    localStorage.setItem(`saved-metadata-${category}`, JSON.stringify(updatedEntries));
    
    // Reset form
    setSaveName('');
    setSaveDescription('');
    setShowSaveModal(false);
    
    alert('Analysis saved successfully!');
  };

  const deleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this saved analysis?')) {
      const updatedEntries = savedEntries.filter(entry => entry.id !== id);
      setSavedEntries(updatedEntries);
      localStorage.setItem(`saved-metadata-${category}`, JSON.stringify(updatedEntries));
    }
  };

  const exportEntry = (entry: SavedMetadataEntry) => {
    const exportData = {
      ...entry,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entry.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Save Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          💾 Saved Metadata Dictionary Analyses
        </h3>
        <button
          onClick={() => setShowSaveModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Save Current Analysis
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Current Analysis</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Data Elements - March Analysis"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Brief description of this analysis..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => saveCurrentAnalysis()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Save Analysis
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Entries List */}
      <div className="space-y-4">
        {savedEntries.length > 0 ? (
          savedEntries.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{entry.name}</h4>
                  {entry.description && (
                    <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    SQL View: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{entry.sqlViewId}</span>
                    {' • '}
                    {entry.metadata.rowCount.toLocaleString()} rows
                    {' • '}
                    {entry.metadata.columns.length} columns
                  </div>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span>Saved: {formatDate(entry.savedAt)}</span>
                    <span className="mx-2">•</span>
                    <span>By: {entry.savedBy}</span>
                    {entry.tags.length > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <div className="flex space-x-1">
                          {entry.tags.map((tag, index) => (
                            <span key={index} className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => onLoad?.(entry)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => exportEntry(entry)}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No saved metadata dictionary analyses found.</p>
            <p className="text-xs mt-1">
              Generate and save analyses from the Debug or Enhanced tabs to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}