'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { MetadataGroupFilter } from '@/components/features/metadata';
import { ProcessingStats, ProcessingQueue, QueueItem } from '@/components/features/processing';
import DictionaryPreviewQueue, { DictionaryPreview } from '@/components/features/processing/DictionaryPreviewQueue';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { InstanceService, DHIS2Instance } from '@/lib/services/instanceService';
import { DictionaryService, CreateDictionaryData } from '@/lib/services/dictionaryService';

interface MetadataGroup {
  id: string;
  name: string;
  displayName: string;
  itemCount: number;
  items?: Array<{ id: string; name: string; displayName: string }>;
}

interface ProcessingEstimate {
  totalItems: number;
  estimatedTimeMinutes: number;
  apiCalls: Array<{
    type: 'sqlView' | 'metadata';
    description: string;
    itemId?: string;
    itemName?: string;
  }>;
}

export default function GeneratePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [instances, setInstances] = useState<DHIS2Instance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [dictName, setDictName] = useState('');
  const [description, setDescription] = useState('');
  const [metadataType, setMetadataType] = useState('');
  const [sqlViewId, setSqlViewId] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [period, setPeriod] = useState('');
  const [processingMethod, setProcessingMethod] = useState<'batch' | 'individual'>('batch');
  
  const [metadataGroups, setMetadataGroups] = useState<MetadataGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<QueueItem[]>([]);
  const [previewQueue, setPreviewQueue] = useState<DictionaryPreview[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingEstimate, setProcessingEstimate] = useState<ProcessingEstimate | null>(null);
  const [stats, setStats] = useState<{
    avgProcessTime: number;
    successRate: number;
    itemsPerMinute: number;
    remainingTime: string;
  }>({
    avgProcessTime: 0,
    successRate: 0,
    itemsPerMinute: 0,
    remainingTime: '0 min'
  });
  
  // Real-time stats update
  const [lastStatsUpdate, setLastStatsUpdate] = useState(Date.now());

  // SQL Views state
  const [sqlViews, setSqlViews] = useState<Array<{
    id: string;
    name: string;
    displayName: string;
    type: string;
    category: string;
  }>>([]);
  const [loadingSqlViews, setLoadingSqlViews] = useState(false);
  const [groupedSqlViews, setGroupedSqlViews] = useState<{
    dataElements: any[];
    indicators: any[];
    programIndicators: any[];
    general: any[];
  }>({
    dataElements: [],
    indicators: [],
    programIndicators: [],
    general: []
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    loadInstances();
  }, [isAuthenticated, router]);

  // Add real-time statistics polling
  useEffect(() => {
    if (!isGenerating && processingQueue.length === 0) return;

    const interval = setInterval(() => {
      // Simulate live stats updates
      setStats(prev => ({
        avgProcessTime: prev.avgProcessTime + (Math.random() - 0.5) * 0.1,
        successRate: Math.max(80, Math.min(99, prev.successRate + (Math.random() - 0.5) * 2)),
        itemsPerMinute: Math.max(10, prev.itemsPerMinute + (Math.random() - 0.5) * 5),
        remainingTime: prev.remainingTime
      }));
      setLastStatsUpdate(Date.now());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isGenerating, processingQueue.length]);

  // Terminate/Cancel generation (updated for preview workflow)
  const cancelGeneration = async () => {
    if (isGenerating) {
      console.log('🛑 Cancelling preview generation');
      setIsGenerating(false);
      handleTerminateAllPreviews();
      setError('Preview generation was cancelled');
    }
  };

  const loadInstances = async () => {
    try {
      setLoadingInstances(true);
      setError(null);
      const data = await InstanceService.getInstances();
      const connectedInstances = data.filter(instance => instance.status === 'connected');
      setInstances(connectedInstances);
      
      // Auto-redirect to instances page if no connected instances found
      if (connectedInstances.length === 0) {
        console.log('🔄 No connected instances found, redirecting to instances page...');
        setError('No connected DHIS2 instances found. Please add and connect an instance first.');
        
        // Show a brief message before redirecting
        setTimeout(() => {
          router.push('/instances?redirect=generate&reason=no-instances');
        }, 2000);
        return;
      }
      
    } catch (err) {
      console.error('Error loading instances:', err);
      setError('Failed to load instances. Please try again.');
      setInstances([]);
    } finally {
      setLoadingInstances(false);
    }
  };

  const loadSqlViews = async (instanceId: string) => {
    if (!instanceId) {
      console.warn('No instance selected, cannot load SQL views');
      return;
    }

    try {
      setLoadingSqlViews(true);
      setError(null);
      
      console.log(`🔍 Loading SQL views for instance: ${instanceId}`);
      
      const response = await fetch(`/api/dhis2/sql-views-list?instanceId=${instanceId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SQL views: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.sqlViews) {
        console.log(`✅ Loaded ${data.data.sqlViews.length} SQL views`);
        setSqlViews(data.data.sqlViews);
        setGroupedSqlViews(data.data.groupedViews);
        
        if (data.data.fallback) {
          console.warn('⚠️ Using fallback SQL views due to API error:', data.data.error);
        }
      } else {
        console.warn('No SQL views found in response:', data);
        setSqlViews([]);
        setGroupedSqlViews({
          dataElements: [],
          indicators: [],
          programIndicators: [],
          general: []
        });
      }
      
    } catch (err) {
      console.error('Error loading SQL views:', err);
      setError('Failed to load SQL views: ' + (err instanceof Error ? err.message : 'Unknown error'));
      
      // Clear SQL views on error
      setSqlViews([]);
      setGroupedSqlViews({
        dataElements: [],
        indicators: [],
        programIndicators: [],
        general: []
      });
    } finally {
      setLoadingSqlViews(false);
    }
  };

  const loadMetadataGroups = async (type: string) => {
    if (!selectedInstance) {
      console.warn('No instance selected, cannot load groups');
      return;
    }

    try {
      setLoadingGroups(true);
      setError(null);
      
      console.log(`🔍 Loading metadata groups for type: ${type}, instance: ${selectedInstance}`);
      
      const response = await fetch(`/api/dhis2/metadata-groups?type=${type}&instanceId=${selectedInstance}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata groups: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.groups) {
        console.log(`✅ Loaded ${data.data.groups.length} groups`);
        setMetadataGroups(data.data.groups);
      } else {
        console.warn('No groups found in response:', data);
        setMetadataGroups([]);
        
        if (data.error) {
          setError(`Failed to load groups: ${data.error}`);
        }
      }
      
    } catch (err) {
      console.error('Error loading metadata groups:', err);
      setError('Failed to load metadata groups: ' + (err instanceof Error ? err.message : 'Unknown error'));
      
      // Fall back to mock data for development
      const mockGroups = getMockGroups(type);
      setMetadataGroups(mockGroups);
    } finally {
      setLoadingGroups(false);
    }
  };

  const getMockGroups = (type: string): MetadataGroup[] => {
    const groupsMap: { [key: string]: MetadataGroup[] } = {
      'dataElements': [
        { id: 'de-group-1', name: 'Immunization Data Elements', displayName: 'Immunization Data Elements', itemCount: 45 },
        { id: 'de-group-2', name: 'Maternal Health Indicators', displayName: 'Maternal Health Indicators', itemCount: 32 },
        { id: 'de-group-3', name: 'Child Health Metrics', displayName: 'Child Health Metrics', itemCount: 28 }
      ],
      'indicators': [
        { id: 'ind-group-1', name: 'Coverage Indicators', displayName: 'Coverage Indicators', itemCount: 23 },
        { id: 'ind-group-2', name: 'Quality Indicators', displayName: 'Quality Indicators', itemCount: 18 },
        { id: 'ind-group-3', name: 'Outcome Indicators', displayName: 'Outcome Indicators', itemCount: 15 }
      ],
      'programIndicators': [
        { id: 'prog-ind-1', name: 'HIV Program Indicators', displayName: 'HIV Program Indicators', itemCount: 12 },
        { id: 'prog-ind-2', name: 'TB Program Indicators', displayName: 'TB Program Indicators', itemCount: 8 },
        { id: 'prog-ind-3', name: 'Malaria Program Indicators', displayName: 'Malaria Program Indicators', itemCount: 10 }
      ]
    };
    
    return groupsMap[type] || [];
  };

  const calculateProcessingEstimate = async (groupId?: string) => {
    if (!metadataType || !sqlViewId) return;

    try {
      let totalItems = 0;
      let apiCalls: ProcessingEstimate['apiCalls'] = [];

      if (groupId && groupId !== '') {
        // Get group details with items
        console.log(`🔍 Getting processing estimate for group: ${groupId}`);
        
        const response = await fetch(`/api/dhis2/metadata-groups?type=${metadataType}&groupId=${groupId}&includeItems=true&instanceId=${selectedInstance}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.group) {
            const group = data.data.group;
            totalItems = group.itemCount;
            
            if (processingMethod === 'individual') {
              // Individual processing: one SQL view call per item
              group.items?.forEach((item: any) => {
                apiCalls.push({
                  type: 'sqlView',
                  description: `Execute SQL view ${sqlViewId} for ${item.displayName}`,
                  itemId: item.id,
                  itemName: item.displayName
                });
              });
            } else {
              // Batch processing: one SQL view call with group filter
              apiCalls.push({
                type: 'sqlView',
                description: `Execute SQL view ${sqlViewId} with group filter: ${group.displayName}`,
              });
            }
          }
        } else {
          // Fall back to group in current state
          const selectedGroupData = metadataGroups.find(g => g.id === groupId);
          if (selectedGroupData) {
            totalItems = selectedGroupData.itemCount;
            
            if (processingMethod === 'individual') {
              // Estimate individual calls
              for (let i = 0; i < totalItems; i++) {
                apiCalls.push({
                  type: 'sqlView',
                  description: `Execute SQL view ${sqlViewId} for item ${i + 1}`,
                });
              }
            } else {
              apiCalls.push({
                type: 'sqlView',
                description: `Execute SQL view ${sqlViewId} with group filter`,
              });
            }
          }
        }
      } else {
        // No group filter - process all items
        const totalFromGroups = metadataGroups.reduce((sum, group) => sum + group.itemCount, 0);
        totalItems = totalFromGroups || 1000; // Estimate if no groups loaded
        
        if (processingMethod === 'individual') {
          apiCalls.push({
            type: 'sqlView',
            description: `Execute SQL view ${sqlViewId} individually for ~${totalItems} items`,
          });
        } else {
          apiCalls.push({
            type: 'sqlView',
            description: `Execute SQL view ${sqlViewId} for all ${metadataType}`,
          });
        }
      }

      // Estimate processing time
      const timePerItem = processingMethod === 'individual' ? 2 : 0.5; // seconds per item
      const estimatedTimeMinutes = Math.ceil((totalItems * timePerItem) / 60);

      const estimate: ProcessingEstimate = {
        totalItems,
        estimatedTimeMinutes,
        apiCalls
      };

      setProcessingEstimate(estimate);
      console.log('📊 Processing estimate:', estimate);
      
    } catch (err) {
      console.error('Error calculating processing estimate:', err);
    }
  };

  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstance(instanceId);
    setMetadataType('');
    setSqlViewId('');
    setMetadataGroups([]);
    setSqlViews([]);
    setGroupedSqlViews({
      dataElements: [],
      indicators: [],
      programIndicators: [],
      general: []
    });
    setProcessingEstimate(null);
    
    // Load SQL views for the selected instance
    if (instanceId) {
      loadSqlViews(instanceId);
    }
  };

  const handleMetadataTypeChange = (type: string) => {
    setMetadataType(type);
    setSqlViewId('');
    setMetadataGroups([]);
    setProcessingEstimate(null);
    
    // Load groups for the selected type
    if (type && selectedInstance) {
      loadMetadataGroups(type);
    }
  };

  const handleGroupFilterChange = (groupId: string) => {
    setGroupFilter(groupId);
    calculateProcessingEstimate(groupId);
  };

  const handleProcessingMethodChange = (method: 'batch' | 'individual') => {
    setProcessingMethod(method);
    // Recalculate estimate with new method
    calculateProcessingEstimate(groupFilter);
  };

  const handleSqlViewChange = (viewId: string) => {
    setSqlViewId(viewId);
    // Recalculate estimate with SQL view
    if (viewId) {
      calculateProcessingEstimate(groupFilter);
    } else {
      setProcessingEstimate(null);
    }
  };

  const handleProcessItems = async () => {
    if (!groupFilter || processingMethod !== 'individual') return;

    try {
      console.log('🎯 Processing items individually for group:', groupFilter);
      
      // Get group items
      const response = await fetch(`/api/dhis2/metadata-groups?type=${metadataType}&groupId=${groupFilter}&includeItems=true&instanceId=${selectedInstance}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group items');
      }

      const data = await response.json();
      if (!data.success || !data.data.group.items) {
        throw new Error('No items found in group');
      }

      const items = data.data.group.items;
      console.log(`📋 Found ${items.length} items to process individually`);

      // Create queue items
      const queueItems: QueueItem[] = items.map((item: any) => ({
        id: item.id,
        name: item.displayName || item.name,
        type: metadataType,
        status: 'pending'
      }));

      setProcessingQueue(queueItems);

      // Simulate individual processing
      processQueueItems(queueItems);

    } catch (err) {
      console.error('Error processing items:', err);
      setError('Failed to process items: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const processQueueItems = async (items: QueueItem[]) => {
    const startTime = Date.now();
    let successCount = 0;
    
    setIsProcessing(true);
    setError(null);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStartTime = Date.now();

      // Update item to processing
      setProcessingQueue(prev => prev.map(qItem => 
        qItem.id === item.id ? { ...qItem, status: 'processing' } : qItem
      ));

      try {
        // Simulate SQL view call for individual item
        const processingTime = 500 + Math.random() * 2000; // 0.5-2.5 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));

        const success = Math.random() > 0.05; // 95% success rate
        
        if (success) {
          successCount++;
          setProcessingQueue(prev => prev.map(qItem => 
            qItem.id === item.id 
              ? { 
                  ...qItem, 
                  status: 'success', 
                  processingTime: (Date.now() - itemStartTime) / 1000,
                  quality: 70 + Math.random() * 30
                }
              : qItem
          ));
        } else {
          setProcessingQueue(prev => prev.map(qItem => 
            qItem.id === item.id 
              ? { 
                  ...qItem, 
                  status: 'error', 
                  processingTime: (Date.now() - itemStartTime) / 1000,
                  error: 'SQL view execution failed'
                }
              : qItem
          ));
        }

        // Update stats
        const processed = i + 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const avgTime = elapsed / processed;
        const successRate = (successCount / processed) * 100;
        const itemsPerMinute = (processed / elapsed) * 60;
        const remaining = Math.max(0, (items.length - processed) / (itemsPerMinute / 60));

        setStats({
          avgProcessTime: avgTime,
          successRate,
          itemsPerMinute,
          remainingTime: remaining < 60 ? `${Math.round(remaining)}s` : `${Math.round(remaining / 60)}m`
        });

      } catch (err) {
        console.error(`Error processing item ${item.id}:`, err);
        setProcessingQueue(prev => prev.map(qItem => 
          qItem.id === item.id 
            ? { 
                ...qItem, 
                status: 'error', 
                processingTime: (Date.now() - itemStartTime) / 1000,
                error: err instanceof Error ? err.message : 'Unknown error'
              }
            : qItem
        ));
      }
    }

    console.log(`✅ Individual processing completed: ${successCount}/${items.length} successful`);
    setIsProcessing(false);
    
    // 🔧 Processing complete - user can now manually generate dictionary
  };

  // Generate dictionary from individual processing results
  const handleGenerateDictionaryFromIndividualResults = async () => {
    const successfulItems = processingQueue.filter(item => item.status === 'success');
    
    if (successfulItems.length === 0) {
      setError('No successful items to create dictionary from');
      return;
    }

    console.log(`🔄 Generating dictionary from ${successfulItems.length} individual results`);
    setIsGenerating(true);
    setError(null);
    
    // Show progress to user
    setProcessingQueue(prev => prev.map(item => ({
      ...item,
      status: item.status === 'success' ? 'processing' : item.status
    })));

    try {
      // Step 1: Make individual API calls for each successful item
      const individualResults = [];
      
      for (const item of successfulItems) {
        try {
          console.log(`🔄 Fetching detailed data for: ${item.name} (${item.id})`);
          
          // Update UI to show this item is being processed
          setProcessingQueue(prev => prev.map(qItem => 
            qItem.id === item.id 
              ? { ...qItem, status: 'processing' }
              : qItem
          ));
          
          // Use the correct parameter name from the error: dataElementId
          const parameterNames = ['dataElementId'];
          let success = false;
          let data = null;
          
          for (const paramName of parameterNames) {
            try {
              console.log(`🔄 Trying parameter name: ${paramName}`);
              
              // Add timeout to prevent indefinite waiting
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds
              
              const response = await fetch('/api/dhis2/sql-views/execute-parameterized', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sqlViewId: sqlViewId,
                  instanceId: selectedInstance,
                  parameters: {
                    [paramName]: item.id
                  }
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);

              if (response.ok) {
                const responseData = await response.json();
                if (responseData.success && responseData.data && responseData.data.length > 0) {
                  data = responseData;
                  success = true;
                  console.log(`✅ Success with parameter: ${paramName}`);
                  break;
                }
              } else {
                console.warn(`⚠️ Failed with parameter ${paramName}: ${response.status}`);
                const errorData = await response.json().catch(() => null);
                console.log(`Error details:`, errorData);
                
                // Handle specific error cases
                if (response.status === 504) {
                  console.warn(`⚠️ Gateway timeout for ${item.name} - SQL view query took too long`);
                }
              }
            } catch (paramError: any) {
              console.warn(`⚠️ Error with parameter ${paramName}:`, paramError);
              
              // Handle abort/timeout errors
              if (paramError.name === 'AbortError') {
                console.warn(`⚠️ Request timed out for ${item.name} after 90 seconds`);
              }
            }
          }

          if (success && data) {
            individualResults.push({
              ...item,
              detailedData: data.data || data,
              apiCallSuccess: true
            });
            
            // Update UI to show this item succeeded
            setProcessingQueue(prev => prev.map(qItem => 
              qItem.id === item.id 
                ? { ...qItem, status: 'success' }
                : qItem
            ));
          } else {
            console.warn(`⚠️ All parameter attempts failed for ${item.name}`);
            individualResults.push({
              ...item,
              detailedData: null,
              apiCallSuccess: false,
              apiError: `All parameter attempts failed`
            });
            
            // Update UI to show this item failed
            setProcessingQueue(prev => prev.map(qItem => 
              qItem.id === item.id 
                ? { ...qItem, status: 'error' }
                : qItem
            ));
          }
        } catch (error) {
          console.error(`❌ Error fetching data for ${item.name}:`, error);
          individualResults.push({
            ...item,
            detailedData: null,
            apiCallSuccess: false,
            apiError: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Update UI to show this item failed
          setProcessingQueue(prev => prev.map(qItem => 
            qItem.id === item.id 
              ? { ...qItem, status: 'error' }
              : qItem
          ));
        }
      }

      // Step 2: Merge successful results - FLATTEN the SQL view data
      const successfulApiCalls = individualResults.filter(result => result.apiCallSuccess);
      
      // Extract the actual SQL view data from detailedData array
      const mergedData = [];
      for (const result of successfulApiCalls) {
        if (result.detailedData && Array.isArray(result.detailedData)) {
          // Each item in detailedData is a row from the SQL view
          for (const sqlRow of result.detailedData) {
            // Add processing metadata to each SQL row
            mergedData.push({
              ...sqlRow,
              // Add quality and processing info as additional columns
              _processing_quality: result.quality,
              _processing_time: result.processingTime,
              _processing_status: result.status
            });
          }
        }
      }

      // Step 3: Create dictionary preview from merged data
      const preview: DictionaryPreview = {
        preview_id: `dict_individual_${Date.now()}`,
        dictionary_name: dictName,
        instance_id: selectedInstance,
        instance_name: instances.find(i => i.id === selectedInstance)?.name || '',
        metadata_type: metadataType || 'dataElements',
        sql_view_id: sqlViewId,
        group_id: groupFilter,
        raw_data: mergedData, // Flattened SQL view data
        headers: mergedData.length > 0 ? Object.keys(mergedData[0]) : [],
        row_count: mergedData.length,
        preview_count: mergedData.length,
        status: 'ready',
        processing_method: 'individual',
        created_at: new Date().toISOString()
      };

      setPreviewQueue(prev => [...prev, preview]);
      console.log(`✅ Dictionary generated from individual processing results`);
      console.log(`📊 Merged ${successfulApiCalls.length} successful API calls out of ${successfulItems.length} items`);
      
      setError(null);
      
    } catch (error) {
      console.error('Error generating dictionary from individual results:', error);
      setError('Failed to generate dictionary from individual results');
    } finally {
      setIsGenerating(false);
    }
  };

  // New preview-based workflow
  const handleGeneratePreview = async () => {
    if (!selectedInstance || !dictName || !sqlViewId) {
      alert('Please fill in all required fields (Instance, Dictionary Name, and SQL View)');
      return;
    }

    const selectedInstanceData = instances.find(i => i.id === selectedInstance);
    if (!selectedInstanceData) {
      alert('Selected instance not found');
      return;
    }

    // Create preview ID outside try block so it's accessible in catch
    const previewId = `preview_${Date.now()}`;

    try {
      setIsGenerating(true);
      setError(null);

      // Create preview entry
      const preview: DictionaryPreview = {
        preview_id: previewId,
        dictionary_name: dictName,
        instance_id: selectedInstance,
        instance_name: selectedInstanceData.name,
        metadata_type: metadataType || 'dataElements',
        sql_view_id: sqlViewId,
        group_id: groupFilter,
        raw_data: [],
        headers: [],
        row_count: 0,
        preview_count: 0,
        status: 'loading',
        created_at: new Date().toISOString()
      };

      setPreviewQueue(prev => [...prev, preview]);

      console.log('🔍 Generating preview for:', dictName);

      // Call preview API
      const response = await fetch('/api/dictionaries/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: selectedInstance,
          sql_view_id: sqlViewId,
          metadata_type: metadataType,
          group_id: groupFilter,
          dictionary_name: dictName
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Preview generated successfully:', result.data.preview_count, 'rows');
        
        // Update preview with results
        setPreviewQueue(prev => prev.map(p => 
          p.preview_id === previewId ? { ...p, ...result.data } : p
        ));

        // Update stats
        setStats(prev => ({
          ...prev,
          avgProcessTime: result.data.execution_time ? (result.data.execution_time / 1000) : prev.avgProcessTime,
          successRate: result.data.status === 'ready' ? 95 : prev.successRate,
          itemsPerMinute: result.data.preview_count > 0 ? Math.round(result.data.preview_count / ((result.data.execution_time || 1000) / 60000)) : prev.itemsPerMinute
        }));

      } else {
        console.error('❌ Preview generation failed:', result.error);
        
        // Update preview with error
        setPreviewQueue(prev => prev.map(p => 
          p.preview_id === previewId ? { 
            ...p, 
            status: 'error', 
            error_message: result.error || 'Failed to generate preview'
          } : p
        ));
        
        setError(`Failed to generate preview: ${result.error}`);
      }

    } catch (err) {
      console.error('Error generating preview:', err);
      
      // Update preview with error
      setPreviewQueue(prev => prev.map(p => 
        p.preview_id === previewId ? { 
          ...p, 
          status: 'error', 
          error_message: err instanceof Error ? err.message : 'Unknown error'
        } : p
      ));
      
      setError('Failed to generate preview: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle table conversion
  const handleConvertToTable = async (preview: DictionaryPreview) => {
    try {
      console.log('🔄 Converting to table:', preview.preview_id);
      
      const response = await fetch('/api/dictionaries/convert-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preview_id: preview.preview_id,
          raw_data: preview.raw_data,
          headers: preview.headers
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Table conversion successful:', result.data.quality_score, '% quality');
        
        // Update preview with converted data
        setPreviewQueue(prev => prev.map(p => 
          p.preview_id === preview.preview_id ? { 
            ...p, 
            ...result.data,
            status: 'converted'
          } : p
        ));

        // Update stats
        setStats(prev => ({
          ...prev,
          successRate: result.data.quality_score || prev.successRate,
          itemsPerMinute: result.data.total_rows || prev.itemsPerMinute
        }));

      } else {
        console.error('❌ Table conversion failed:', result.error);
        alert(`Failed to convert table: ${result.error}`);
      }

    } catch (error) {
      console.error('Error converting table:', error);
      alert('Failed to convert table: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle dictionary saving
  const handleSaveDictionary = async (preview: DictionaryPreview) => {
    try {
      console.log('💾 Saving dictionary:', preview.preview_id);
      
      const response = await fetch('/api/dictionaries/save-from-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preview_id: preview.preview_id,
          dictionary_name: preview.dictionary_name,
          instance_id: preview.instance_id,
          instance_name: preview.instance_name,
          metadata_type: preview.metadata_type,
          sql_view_id: preview.sql_view_id,
          group_id: preview.group_id,
          structured_data: preview.structured_data,
          detected_columns: preview.detected_columns,
          column_metadata: preview.column_metadata,
          quality_score: preview.quality_score,
          execution_time: preview.execution_time
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Dictionary saved successfully:', result.data.dictionary_id);
        
        // Update preview status
        setPreviewQueue(prev => prev.map(p => 
          p.preview_id === preview.preview_id ? { 
            ...p, 
            status: 'saved'
          } : p
        ));

        alert(`Dictionary "${preview.dictionary_name}" has been saved successfully! Found ${result.data.variables_count} variables with ${result.data.quality_score}% quality score.`);

        // Reset form
        setDictName('');
        setDescription('');
        setMetadataType('');
        setSqlViewId('');
        setGroupFilter('');
        setPeriod('');
        setProcessingMethod('batch');
        setMetadataGroups([]);
        setProcessingEstimate(null);

      } else {
        console.error('❌ Dictionary saving failed:', result.error);
        alert(`Failed to save dictionary: ${result.error}`);
      }

    } catch (error) {
      console.error('Error saving dictionary:', error);
      alert('Failed to save dictionary: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle preview termination
  const handleTerminatePreview = (previewId: string) => {
    console.log('🛑 Terminating preview:', previewId);
    
    setPreviewQueue(prev => prev.map(p => 
      p.preview_id === previewId ? { 
        ...p, 
        status: 'error',
        error_message: 'Cancelled by user'
      } : p
    ));
  };

  // Handle terminate all previews
  const handleTerminateAllPreviews = () => {
    console.log('🛑 Terminating all previews');
    
    setPreviewQueue(prev => prev.map(p => 
      p.status === 'loading' || p.status === 'ready' ? { 
        ...p, 
        status: 'error',
        error_message: 'Cancelled by user'
      } : p
    ));
  };

  // Handle processing queue termination
  const handleTerminateProcessing = async () => {
    if (isProcessing) {
      console.log('🛑 Cancelling processing queue');
      setIsProcessing(false);
      
      // Update all active processing items to error state
      setProcessingQueue(prev => prev.map(item => ({
        ...item,
        status: item.status === 'processing' ? 'error' : item.status,
        error: item.status === 'processing' ? 'Cancelled by user' : item.error
      })));
      
      setError('Processing was cancelled');
    }
    
    setIsGenerating(false);
  };

  // Get SQL views filtered by metadata type (or all views if no type selected)
  const getFilteredSqlViews = () => {
    // If no metadata type selected, show all available SQL views
    if (!metadataType) return sqlViews;
    
    // Filter SQL views based on the selected metadata type
    switch (metadataType) {
      case 'dataElements':
      case 'dataElementGroups':
        return [...groupedSqlViews.dataElements, ...groupedSqlViews.general];
      case 'indicators':
      case 'indicatorGroups':
        return [...groupedSqlViews.indicators, ...groupedSqlViews.general];
      case 'programIndicators':
        return [...groupedSqlViews.programIndicators, ...groupedSqlViews.general];
      default:
        return sqlViews;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="warning">
          Please sign in to generate metadata dictionaries.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 page-transition">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate New Metadata Dictionary</h1>
      
      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadInstances}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {loadingInstances ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading instances...</p>
        </div>
      ) : instances.length === 0 ? (
        <Alert variant="warning">
          <div className="text-center">
            <p className="mb-4">No connected DHIS2 instances found.</p>
            <Button onClick={() => router.push('/instances')} className="bg-blue-600 hover:bg-blue-700">
              Manage Instances
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Dictionary Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dictionary Name *
                  </label>
                  <input
                    type="text"
                    value={dictName}
                    onChange={(e) => setDictName(e.target.value)}
                    placeholder="e.g., Q1 2025 Health Data Elements"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this dictionary..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DHIS2 Instance *
                  </label>
                  <select
                    value={selectedInstance}
                    onChange={(e) => handleInstanceChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Instance</option>
                    {instances.map(instance => (
                      <option key={instance.id} value={instance.id}>
                        {instance.name} ({instance.version})
                      </option>
                    ))}
                  </select>
                  {loadingSqlViews && (
                    <p className="text-sm text-blue-500 mt-1">Loading SQL views...</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metadata Type <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <select
                    value={metadataType}
                    onChange={(e) => handleMetadataTypeChange(e.target.value)}
                    disabled={!selectedInstance}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">No specific type (use SQL view directly)</option>
                    <option value="dataElements">Data Elements</option>
                    <option value="indicators">Indicators</option>
                    <option value="programIndicators">Program Indicators</option>
                    <option value="dataElementGroups">Data Element Groups</option>
                    <option value="indicatorGroups">Indicator Groups</option>
                  </select>
                  {loadingGroups && (
                    <p className="text-sm text-gray-500 mt-1">Loading groups...</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Select a type to filter SQL views and enable group-based filtering. Leave empty to see all SQL views.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SQL View *
                  </label>
                  <select
                    value={sqlViewId}
                    onChange={(e) => handleSqlViewChange(e.target.value)}
                    disabled={!selectedInstance || sqlViews.length === 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select SQL View</option>
                    {getFilteredSqlViews().map(view => (
                      <option key={view.id} value={view.id}>
                        {view.displayName} ({view.type})
                      </option>
                    ))}
                  </select>
                  {sqlViews.length === 0 && selectedInstance && (
                    <p className="text-sm text-gray-500 mt-1">
                      {loadingSqlViews ? 'Loading SQL views...' : 'No SQL views available for this instance'}
                    </p>
                  )}
                  {!metadataType && sqlViews.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ Showing all SQL views. Select a metadata type above to filter by category.
                    </p>
                  )}
                </div>

                {metadataGroups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Filter (Optional)
                    </label>
                    <select
                      value={groupFilter}
                      onChange={(e) => handleGroupFilterChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Groups</option>
                      {metadataGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.displayName || group.name} ({group.itemCount} items)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period (Optional)
                  </label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g., Q1 2025, 2024, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Method
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="batch"
                        checked={processingMethod === 'batch'}
                        onChange={(e) => handleProcessingMethodChange(e.target.value as 'batch')}
                        className="mr-2"
                      />
                      Batch Processing
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="individual"
                        checked={processingMethod === 'individual'}
                        onChange={(e) => handleProcessingMethodChange(e.target.value as 'individual')}
                        className="mr-2"
                      />
                      Individual Processing
                    </label>
                  </div>
                </div>

                {/* Processing Estimate */}
                {processingEstimate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Processing Estimate</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Items to process:</strong> {processingEstimate.totalItems}</p>
                      <p><strong>Estimated time:</strong> {processingEstimate.estimatedTimeMinutes} minutes</p>
                      <p><strong>API calls to be made:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        {processingEstimate.apiCalls.slice(0, 5).map((call, index) => (
                          <li key={index} className="text-xs">{call.description}</li>
                        ))}
                        {processingEstimate.apiCalls.length > 5 && (
                          <li className="text-xs text-blue-600">
                            ... and {processingEstimate.apiCalls.length - 5} more calls
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                {isGenerating ? (
                  <div className="flex-1 flex gap-3">
                    <Button
                      disabled
                      className="flex-1 bg-gray-400 cursor-not-allowed"
                    >
                      ⏳ Generating...
                    </Button>
                    <Button
                      onClick={cancelGeneration}
                      className="bg-red-500 hover:bg-red-600 text-white flex items-center space-x-2"
                    >
                      <span>⏹</span>
                      <span>Terminate</span>
                    </Button>
                  </div>
                ) : (
                                  <Button
                  onClick={handleGeneratePreview}
                  disabled={!selectedInstance || !dictName || !sqlViewId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  🔍 Generate Preview
                </Button>
                )}
                
                {processingMethod === 'individual' && groupFilter && !isGenerating && (
                  <Button
                    onClick={handleProcessItems}
                    variant="outline"
                  >
                    Process Items
                  </Button>
                )}
              </div>
            </Card>
          </div>
          
          {/* Processing Queue & Stats */}
          <div className="space-y-6">
            {/* Processing Stats */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Processing Statistics</h3>
                <div className="flex items-center space-x-3">
                  {(isGenerating || previewQueue.length > 0) && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">
                        Live • Updated {new Date(lastStatsUpdate).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {(isGenerating || previewQueue.some(p => p.status === 'loading')) && (
                    <Button
                      onClick={cancelGeneration}
                      variant="outline"
                      size="sm"
                      className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 flex items-center space-x-2"
                    >
                      <span>⏹</span>
                      <span>Terminate</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.avgProcessTime.toFixed(1)}s</div>
                  <div className="text-sm text-gray-600">Avg Process Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(0)}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.itemsPerMinute.toFixed(0)}</div>
                  <div className="text-sm text-gray-600">Items/Min</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.remainingTime}</div>
                  <div className="text-sm text-gray-600">Est. Remaining</div>
                </div>
              </div>
            </Card>
            
            {/* Processing Queue - Individual Items */}
            {processingQueue.length > 0 && (
              <ProcessingQueue
                items={processingQueue}
                onTerminate={handleTerminateProcessing}
                isProcessing={isProcessing}
                onGenerateDictionary={handleGenerateDictionaryFromIndividualResults}
              />
            )}
            
            {/* Dictionary Preview Queue */}
            {previewQueue.length > 0 ? (
              <DictionaryPreviewQueue
                previews={previewQueue}
                onTerminate={handleTerminatePreview}
                onTerminateAll={handleTerminateAllPreviews}
                onConvertToTable={handleConvertToTable}
                onSaveDictionary={handleSaveDictionary}
                maxVisible={10}
              />
            ) : processingQueue.length === 0 ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Dictionary Preview Queue</h3>
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">🔍</div>
                  <p>No dictionary previews yet</p>
                  <p className="text-sm mt-2">Click "Generate Preview" to see SQL view data before creating dictionaries</p>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>💡</span>
          Dictionary Generation Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <p>• <strong>Choose the right instance:</strong> Select a connected DHIS2 instance with the data you need</p>
            <p>• <strong>Use descriptive names:</strong> Dictionary names should clearly indicate content and period</p>
            <p>• <strong>Group filtering:</strong> Filter by specific groups to focus on relevant metadata</p>
          </div>
          <div className="space-y-2">
            <p>• <strong>Batch vs Individual:</strong> Batch for large sets, Individual for detailed control</p>
            <p>• <strong>Processing time:</strong> Larger dictionaries may take several minutes to complete</p>
            <p>• <strong>Quality scores:</strong> Higher scores indicate better metadata completeness</p>
          </div>
        </div>
      </div>
    </div>
  );
} 