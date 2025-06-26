# DHIS2 Metadata Dictionary - Prototype Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the enhanced prototype design into the existing Next.js codebase while preserving all current functionality, APIs, and SQL views.

## Implementation Strategy

### Phase 1: UI/UX Migration
1. **Preserve existing functionality** - All APIs and SQL views remain intact
2. **Enhance with prototype features** - Add group-based filtering and individual processing
3. **Maintain service architecture** - Keep the composition-based service pattern
4. **Progressive enhancement** - Implement features incrementally

### Phase 2: Feature Mapping

| Prototype Feature | Current Codebase Location | Implementation Action |
|------------------|--------------------------|---------------------|
| Navigation Bar | `app/components/navigation/Navbar.tsx` | Update styling, add instance selector |
| Hero Section | `app/(public)/page.tsx` | Enhance with gradient text and feature cards |
| Group-Based Filtering | NEW | Add to `app/components/metadata/MetadataGroupFilter.tsx` |
| Individual Processing | Partial in `EnhancedSqlViewTable.tsx` | Enhance with real-time visualization |
| Processing Stats | NEW | Create `app/components/processing/ProcessingStats.tsx` |
| Live Results Table | Exists in debug mode | Enhance with status indicators |

## Detailed Implementation Steps

### Step 1: Update Global Styles
**File**: `app/styles/globals.css`

```css
/* Add these CSS variables to match prototype design */
:root {
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --secondary: #7c3aed;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;
}

/* Add gradient text utility */
.gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Step 2: Create Metadata Group Filter Component
**New File**: `app/components/metadata/MetadataGroupFilter.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useDhis2Api } from '@/hooks/use-dhis2-api';

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

export function MetadataGroupFilter({ 
  metadataType, 
  onGroupSelect, 
  onProcessingMethodChange 
}: MetadataGroupFilterProps) {
  const [groups, setGroups] = useState<MetadataGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [processingMethod, setProcessingMethod] = useState<'batch' | 'individual'>('batch');
  const { fetchWithAuth } = useDhis2Api();

  useEffect(() => {
    loadGroups();
  }, [metadataType]);

  const loadGroups = async () => {
    const endpoint = metadataType === 'dataElements' 
      ? '/dataElementGroups?fields=id,name,dataElements~size&pageSize=100'
      : '/indicatorGroups?fields=id,name,indicators~size&pageSize=100';
    
    const response = await fetchWithAuth(endpoint);
    const data = await response.json();
    
    setGroups(data[metadataType === 'dataElements' ? 'dataElementGroups' : 'indicatorGroups']
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        itemCount: g[metadataType === 'dataElements' ? 'dataElements' : 'indicators']
      })));
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
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          Filter by Group 
          <span className="text-gray-500 font-normal ml-1">(Recommended for large datasets)</span>
        </label>
        <Select value={selectedGroup} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-full mt-1">
            <SelectValue placeholder="All Items (May cause timeout for large datasets)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Items</SelectItem>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} ({group.itemCount} items)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
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
                onChange={(e) => {
                  setProcessingMethod('batch');
                  onProcessingMethodChange('batch');
                }}
                className="text-blue-600"
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
                onChange={(e) => {
                  setProcessingMethod('individual');
                  onProcessingMethodChange('individual');
                }}
                className="text-blue-600"
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
```

### Step 3: Create Processing Statistics Component
**New File**: `app/components/processing/ProcessingStats.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';

interface ProcessingStatsProps {
  avgProcessTime: number;
  successRate: number;
  itemsPerMinute: number;
  remainingTime: string;
}

export function ProcessingStats({ 
  avgProcessTime, 
  successRate, 
  itemsPerMinute, 
  remainingTime 
}: ProcessingStatsProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Processing Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {avgProcessTime.toFixed(1)}s
          </div>
          <div className="text-sm text-gray-600">Avg. Process Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {successRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {Math.floor(itemsPerMinute)}
          </div>
          <div className="text-sm text-gray-600">Items/Minute</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {remainingTime}
          </div>
          <div className="text-sm text-gray-600">Est. Remaining</div>
        </div>
      </div>
    </Card>
  );
}
```

### Step 4: Enhance Data Elements Page
**File**: `app/(authenticated)/data-elements/page.tsx`

Add the following imports and integrate the new components:

```typescript
import { MetadataGroupFilter } from '@/components/metadata/MetadataGroupFilter';
import { ProcessingStats } from '@/components/processing/ProcessingStats';
import { ProcessingQueue } from '@/components/processing/ProcessingQueue';

// Add state for group-based processing
const [selectedGroup, setSelectedGroup] = useState<string>('');
const [processingMethod, setProcessingMethod] = useState<'batch' | 'individual'>('batch');
const [processingStats, setProcessingStats] = useState({
  avgProcessTime: 0,
  successRate: 0,
  itemsPerMinute: 0,
  remainingTime: '--'
});

// Add to the enhanced tab content
{activeTab === 'enhanced' && (
  <div className="space-y-6">
    <MetadataGroupFilter
      metadataType="dataElements"
      onGroupSelect={(groupId, itemCount) => {
        setSelectedGroup(groupId);
        // Update fetch logic to use group
      }}
      onProcessingMethodChange={setProcessingMethod}
    />
    
    {isProcessing && (
      <>
        <ProcessingQueue 
          items={processingQueue}
          onItemProcessed={updateProcessingStats}
        />
        <ProcessingStats {...processingStats} />
      </>
    )}
    
    <EnhancedSqlViewTable
      sqlViewId={sqlViewId}
      groupId={selectedGroup}
      processingMethod={processingMethod}
      onStatsUpdate={setProcessingStats}
    />
  </div>
)}
```

### Step 5: Update Enhanced SQL View Table
**File**: `app/components/sql-views/EnhancedSqlViewTable.tsx`

Enhance with individual processing capability:

```typescript
// Add new props
interface EnhancedSqlViewTableProps {
  sqlViewId: string;
  groupId?: string;
  processingMethod?: 'batch' | 'individual';
  onStatsUpdate?: (stats: ProcessingStats) => void;
}

// Add individual processing logic
const processIndividually = async (items: any[]) => {
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    setProcessingQueue(prev => [...prev, { ...item, status: 'processing' }]);
    
    try {
      // Process individual item through SQL view
      const response = await fetchWithAuth(
        `/sqlViews/${sqlViewId}/data.json?var=dataElementId:${item.id}`
      );
      const data = await response.json();
      
      results.push({ ...data, status: 'success' });
      
      // Update stats
      const processed = i + 1;
      const elapsed = (Date.now() - startTime) / 1000;
      const avgTime = elapsed / processed;
      const successRate = (results.filter(r => r.status === 'success').length / processed) * 100;
      const itemsPerMinute = (processed / elapsed) * 60;
      const remaining = ((items.length - processed) / itemsPerMinute).toFixed(0);
      
      onStatsUpdate?.({
        avgProcessTime: avgTime,
        successRate,
        itemsPerMinute,
        remainingTime: remaining < 1 ? '< 1 min' : `${remaining} min`
      });
      
    } catch (error) {
      results.push({ ...item, status: 'error', error: error.message });
    }
    
    // Update UI
    setProcessingQueue(prev => 
      prev.map(p => p.id === item.id ? results[results.length - 1] : p)
    );
  }
  
  return results;
};
```

### Step 6: Update Navigation Component
**File**: `app/components/navigation/Navbar.tsx`

Add instance selector to match prototype:

```typescript
// Add to the navigation bar
<div className="flex items-center gap-4">
  <InstanceSelector />
  <UserMenu />
</div>

// Create InstanceSelector component
function InstanceSelector() {
  const { currentInstance, setInstance } = useAuthStore();
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
      <span className="text-gray-600">Instance:</span>
      <select 
        value={currentInstance}
        onChange={(e) => setInstance(e.target.value)}
        className="bg-transparent border-none focus:outline-none font-medium"
      >
        <option value="demo">Demo DHIS2</option>
        <option value="production">Production</option>
        <option value="new">+ Add New Instance</option>
      </select>
    </div>
  );
}
```

### Step 7: Create Processing Queue Component
**New File**: `app/components/processing/ProcessingQueue.tsx`

```typescript
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface QueueItem {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  processingTime?: number;
  quality?: number;
  error?: string;
}

interface ProcessingQueueProps {
  items: QueueItem[];
  maxVisible?: number;
}

export function ProcessingQueue({ items, maxVisible = 10 }: ProcessingQueueProps) {
  const visibleItems = items.slice(0, maxVisible);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 animate-pulse';
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Processing Queue & Results</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">UID</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="w-20">Quality</TableHead>
              <TableHead className="w-32">Processing Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => (
              <TableRow key={item.id} className={getRowClass(item.status)}>
                <TableCell>
                  <div className="flex justify-center">
                    {getStatusIcon(item.status)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {item.id}
                  </code>
                </TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>
                  {item.quality && (
                    <Badge 
                      variant={item.quality > 80 ? 'success' : 'warning'}
                      className="text-xs"
                    >
                      {item.quality}%
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {item.processingTime 
                    ? `${(item.processingTime / 1000).toFixed(2)}s`
                    : item.status === 'processing' 
                    ? 'Processing...' 
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {items.length > maxVisible && (
        <p className="text-sm text-gray-500 text-center">
          Showing {maxVisible} of {items.length} items
        </p>
      )}
    </div>
  );
}
```

### Step 8: Update API Routes for Group Processing
**File**: `app/api/dhis2/sql-views/[sqlViewId]/route.ts`

Add support for variable parameters:

```typescript
export async function GET(
  request: Request,
  { params }: { params: { sqlViewId: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated || !auth.credentials) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vars = Object.fromEntries(searchParams.entries());
    
    // Build variable parameters for SQL view
    const varParams = Object.keys(vars)
      .filter(key => key.startsWith('var'))
      .map(key => `${key}=${vars[key]}`)
      .join('&');

    const endpoint = `/sqlViews/${params.sqlViewId}/data.json${varParams ? '?' + varParams : ''}`;
    
    const response = await dhis2Api.get(endpoint, auth.credentials);
    
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 9: Preserve Existing Features
Ensure these existing features remain intact:

1. **SQL View Service Architecture**
   - Keep all services in `/lib/services/`
   - Maintain composition pattern
   - Preserve caching logic

2. **Authentication Flow**
   - Keep multi-tier authentication
   - Preserve session management
   - Maintain Supabase integration

3. **Quality Assessment**
   - Keep quality scoring algorithms
   - Preserve quality filters
   - Maintain export functionality

4. **Performance Optimizations**
   - Keep virtualization
   - Preserve LRU caching
   - Maintain batch processing

### Step 10: Testing Checklist
Before deployment, verify:

- [ ] All existing API routes work
- [ ] SQL views execute correctly
- [ ] Authentication flow intact
- [ ] Quality assessments functional
- [ ] Export features working
- [ ] Group filtering operational
- [ ] Individual processing prevents timeouts
- [ ] Processing stats accurate
- [ ] UI matches prototype design
- [ ] Mobile responsiveness maintained

## Migration Commands for Claude CLI

```bash
# 1. Create new components
touch app/components/metadata/MetadataGroupFilter.tsx
touch app/components/processing/ProcessingStats.tsx
touch app/components/processing/ProcessingQueue.tsx

# 2. Update existing files with careful preservation
# Use git to track changes
git add -A
git commit -m "Checkpoint before prototype integration"

# 3. Implement changes incrementally
# Test after each major change

# 4. Run development server to test
npm run dev

# 5. Test all features thoroughly
# Use the testing checklist above
```

## Important Notes

1. **Preserve all SQL views** - The prototype references these SQL view IDs that must remain functional:
   - `YN8eFwDcO0r` - Active Data Elements
   - `ABC123XYZ` - Data Element Completeness
   - `IND456ABC` - Indicators with Formulas

2. **Maintain API compatibility** - All existing API routes must continue working

3. **Keep service architecture** - The composition-based service pattern is core to the system

4. **Progressive enhancement** - Add new features without breaking existing ones

5. **Test incrementally** - Test each component as you implement it

This guide ensures the prototype's enhanced UI and group-based processing features are integrated while preserving all existing functionality.