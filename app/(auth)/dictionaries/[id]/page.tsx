'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Database,
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';

interface Dictionary {
  id: string;
  name: string;
  description: string;
  instance_name: string;
  metadata_type: string;
  sql_view_id: string;
  group_id?: string;
  processing_method: string;
  period?: string;
  version: string;
  variables_count: number;
  status: 'active' | 'generating' | 'error';
  quality_average: number;
  processing_time?: number;
  success_rate: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export default function DictionaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const dictionaryId = params.id as string;

  // Fetch dictionary data
  const fetchDictionary = async () => {
    try {
      const response = await fetch(`/api/dictionaries/${dictionaryId}`);
      const result = await response.json();

      if (result.success) {
        setDictionary(result.data);
        setError(null);
        
        // If status is generating, set up auto-refresh
        if (result.data.status === 'generating') {
          if (!refreshInterval) {
            const interval = setInterval(fetchDictionary, 5000); // Refresh every 5 seconds
            setRefreshInterval(interval);
          }
        } else {
          // Clear refresh if not generating
          if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
          }
        }
      } else {
        setError(result.error || 'Failed to fetch dictionary');
      }
    } catch (err) {
      setError('Failed to load dictionary data');
      console.error('Error fetching dictionary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDictionary();
    
    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [dictionaryId]);

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-100',
          text: 'Active'
        };
      case 'generating':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          text: 'Generating...'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-100',
          text: 'Error'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dictionary...</p>
        </div>
      </div>
    );
  }

  if (error || !dictionary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Dictionary</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(dictionary.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dictionaries
              </button>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-2xl font-bold text-gray-800">{dictionary.name}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusDisplay.bg}`}>
                <statusDisplay.icon className={`w-4 h-4 ${statusDisplay.color} ${
                  dictionary.status === 'generating' ? 'animate-spin' : ''
                }`} />
                <span className={`text-sm font-medium ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>
              
              {/* Actions */}
              {dictionary.status === 'active' && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              )}
              
              <button 
                onClick={fetchDictionary}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Generating Status Alert */}
        {dictionary.status === 'generating' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">Dictionary Generation in Progress</h3>
                <p className="text-blue-700 text-sm mt-1">
                  This dictionary is currently being generated. The page will automatically refresh 
                  every 5 seconds to show the latest status. You can also manually refresh using the button above.
                </p>
                {refreshInterval && (
                  <p className="text-blue-600 text-xs mt-2">
                    ⏱️ Auto-refreshing every 5 seconds...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Status Alert */}
        {dictionary.status === 'error' && dictionary.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Generation Error</h3>
                <p className="text-red-700 text-sm mt-1">{dictionary.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dictionary Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Dictionary Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-800 mt-1">{dictionary.description || 'No description provided'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Instance</label>
                    <p className="text-gray-800 mt-1">{dictionary.instance_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Metadata Type</label>
                    <p className="text-gray-800 mt-1 capitalize">{dictionary.metadata_type}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Processing Method</label>
                    <p className="text-gray-800 mt-1 capitalize">{dictionary.processing_method}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Version</label>
                    <p className="text-gray-800 mt-1">{dictionary.version}</p>
                  </div>
                </div>
                
                {dictionary.period && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Period</label>
                    <p className="text-gray-800 mt-1">{dictionary.period}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Variables</span>
                  </div>
                  <span className="font-medium text-gray-800">{dictionary.variables_count}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Quality Score</span>
                  </div>
                  <span className="font-medium text-gray-800">{dictionary.quality_average.toFixed(1)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Success Rate</span>
                  </div>
                  <span className="font-medium text-gray-800">{dictionary.success_rate.toFixed(1)}%</span>
                </div>
                
                {dictionary.processing_time && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Processing Time</span>
                    </div>
                    <span className="font-medium text-gray-800">{dictionary.processing_time}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Timeline</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Created</span>
                  </div>
                  <p className="text-sm text-gray-800 ml-6">
                    {new Date(dictionary.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Last Updated</span>
                  </div>
                  <p className="text-sm text-gray-800 ml-6">
                    {new Date(dictionary.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 