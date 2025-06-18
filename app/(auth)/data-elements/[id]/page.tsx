'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDHIS2Auth } from '../../../../hooks/useDHIS2Auth';
import { Button } from '../../../../components/ui/Button';
import { QualityBadge } from '../../../../components/metadata/QualityBadge';
import { formatDate } from '../../../../lib/utils';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface DataElement {
  id: string;
  displayName: string;
  name: string;
  code?: string;
  description?: string;
  shortName?: string;
  formName?: string;
  domainType?: string;
  valueType?: string;
  aggregationType?: string;
  created: string;
  lastUpdated: string;
  categoryCombo?: {
    id: string;
    displayName: string;
  };
  optionSet?: {
    id: string;
    displayName: string;
  };
}

interface QualityAssessment {
  qualityScore: number;
  hasDescription: boolean;
  hasCode: boolean;
  isActive: boolean;
  isRecent: boolean;
}

export default function DataElementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useDHIS2Auth();
  const [dataElement, setDataElement] = useState<DataElement | null>(null);
  const [quality, setQuality] = useState<QualityAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDataElement = async () => {
      if (!session || !params.id) return;

      try {
        setLoading(true);
        
        // Fetch data element details
        const response = await fetch(`/api/dhis2/proxy?endpoint=dataElements/${params.id}`, {
          headers: {
            'Authorization': `Basic ${session.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch data element');
        }

        const data = await response.json();
        setDataElement(data);

        // Fetch quality assessment
        const qualityResponse = await fetch('/api/metadata/quality', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metadata: data,
            type: 'dataElement'
          }),
        });

        if (qualityResponse.ok) {
          const qualityData = await qualityResponse.json();
          setQuality(qualityData);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDataElement();
  }, [session, params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !dataElement) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Error</h3>
          <p className="text-red-600">{error || 'Data element not found'}</p>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Data Elements
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {dataElement.displayName || dataElement.name}
            </h1>
            {dataElement.code && (
              <p className="text-sm text-gray-500 font-mono mt-1">
                Code: {dataElement.code}
              </p>
            )}
          </div>
          {quality && (
            <QualityBadge score={quality.qualityScore} size="lg" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
            {dataElement.description ? (
              <p className="text-gray-700">{dataElement.description}</p>
            ) : (
              <p className="text-gray-400 italic">No description available</p>
            )}
          </div>

          {/* Technical Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Technical Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Domain Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{dataElement.domainType || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Value Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{dataElement.valueType || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Aggregation Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{dataElement.aggregationType || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Short Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{dataElement.shortName || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Form Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{dataElement.formName || 'Not specified'}</dd>
              </div>
              {dataElement.categoryCombo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category Combination</dt>
                  <dd className="mt-1 text-sm text-gray-900">{dataElement.categoryCombo.displayName}</dd>
                </div>
              )}
              {dataElement.optionSet && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Option Set</dt>
                  <dd className="mt-1 text-sm text-gray-900">{dataElement.optionSet.displayName}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">{dataElement.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(dataElement.created)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(dataElement.lastUpdated)}</dd>
              </div>
            </dl>
          </div>

          {/* Quality Assessment */}
          {quality && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quality Assessment</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Has Description</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quality.hasDescription 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {quality.hasDescription ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Has Code</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quality.hasCode 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {quality.hasCode ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Is Active</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quality.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {quality.isActive ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recently Updated</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quality.isRecent 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {quality.isRecent ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 