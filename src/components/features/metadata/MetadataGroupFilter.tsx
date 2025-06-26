'use client';

import { useState, useEffect } from 'react';
import Select, { SelectOption } from '@/components/ui/Select';
import Alert, { AlertDescription } from '@/components/ui/Alert';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useDHIS2Auth } from '../../../../hooks/useDHIS2Auth';

interface MetadataGroup {
  id: string;
  name: string;
  itemCount: number;
}

interface MetadataGroupFilterProps {
  metadataType: 'dataElements' | 'indicators' | 'programIndicators';
  onGroupSelect: (groupId: string, itemCount: number) => void;
  onProcessingMethodChange: (method: 'batch' | 'individual') => void;
}

export default function MetadataGroupFilter({ 
  metadataType, 
  onGroupSelect, 
  onProcessingMethodChange 
}: MetadataGroupFilterProps) {
  const [groups, setGroups] = useState<MetadataGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [processingMethod, setProcessingMethod] = useState<'batch' | 'individual'>('batch');
  const [loading, setLoading] = useState(false);
  const { session } = useDHIS2Auth();

  useEffect(() => {
    if (session) {
      loadGroups();
    }
  }, [metadataType, session]);

  const loadGroups = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const endpoint = metadataType === 'dataElements' 
        ? 'dataElementGroups'
        : 'indicatorGroups';
      
      const fields = metadataType === 'dataElements'
        ? 'id,name,dataElements~size'
        : 'id,name,indicators~size';
        
      const url = `${session.serverUrl}/${endpoint}.json?fields=${fields}&pageSize=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${session.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`);
      }
      
      const data = await response.json();
      const groupsData = data[endpoint] || [];
      
      const formattedGroups: MetadataGroup[] = groupsData.map((group: any) => ({
        id: group.id,
        name: group.name,
        itemCount: metadataType === 'dataElements' 
          ? group.dataElements || 0
          : group.indicators || 0
      }));
      
      setGroups(formattedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      onGroupSelect(groupId, group.itemCount);
      
      // Auto-select processing method based on size
      if (group.itemCount > 500) {
        setProcessingMethod('individual');
        onProcessingMethodChange('individual');
      } else {
        // Reset to batch for smaller groups
        setProcessingMethod('batch');
        onProcessingMethodChange('batch');
      }
    } else {
      // Clear selection
      onGroupSelect('', 0);
      setProcessingMethod('batch');
      onProcessingMethodChange('batch');
    }
  };

  const handleProcessingMethodChange = (method: 'batch' | 'individual') => {
    setProcessingMethod(method);
    onProcessingMethodChange(method);
  };

  const selectOptions: SelectOption[] = [
    { value: '', label: 'All Items (May cause timeout for large datasets)' },
    ...groups.map(group => ({
      value: group.id,
      label: `${group.name} (${group.itemCount} items)`
    }))
  ];

  return (
    <div className="space-y-4">
      <div>
        <Select
          label="Filter by Group"
          placeholder="All Items (May cause timeout for large datasets)"
          value={selectedGroup}
          options={selectOptions}
          onChange={handleGroupChange}
          helperText="Recommended for large datasets"
          fullWidth
          disabled={loading}
        />
      </div>

      <Alert variant="info" className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          <strong>Performance Tip:</strong> Select a group to process items individually and avoid timeout errors. 
          The system will fetch group members and process each item through the SQL view separately.
        </AlertDescription>
      </Alert>

      {selectedGroup && (
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Processing Method</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="batch"
                checked={processingMethod === 'batch'}
                onChange={() => handleProcessingMethodChange('batch')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium">Batch Processing</span>
                <p className="text-sm text-gray-500">Faster but may timeout</p>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="individual"
                checked={processingMethod === 'individual'}
                onChange={() => handleProcessingMethodChange('individual')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium">Individual Processing</span>
                <p className="text-sm text-gray-500">Slower but prevents timeouts</p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}