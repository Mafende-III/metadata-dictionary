import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { InstanceService } from '../../../../lib/services/instanceService';
import { createDHIS2ClientFromInstance } from '../../../../lib/utils/dhis2ClientFactory';

interface MetadataGroup {
  id: string;
  name: string;
  displayName: string;
  itemCount: number;
  items?: Array<{ id: string; name: string; displayName: string }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metadataType = searchParams.get('type');
    const includeItems = searchParams.get('includeItems') === 'true';
    const groupId = searchParams.get('groupId');
    const instanceId = searchParams.get('instanceId');

    console.log('🔍 Metadata groups request:', { metadataType, includeItems, groupId, instanceId });

    if (!metadataType) {
      return NextResponse.json({
        success: false,
        error: 'Metadata type is required'
      }, { status: 400 });
    }

    if (!instanceId) {
      return NextResponse.json({
        success: false,
        error: 'Instance ID is required'
      }, { status: 400 });
    }

    // Get instance details and credentials
    const instance = await InstanceService.getInstance(instanceId);
    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    const credentials = await InstanceService.getInstanceCredentials(instanceId);
    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: 'Unable to get instance credentials'
      }, { status: 401 });
    }

    // Create DHIS2 client with standardized SSL configuration based on instance data
    const dhis2Client = await createDHIS2ClientFromInstance(instance, credentials);

    console.log(`🔐 Using instance: ${instance.name} (${instance.base_url})`);

    // If requesting a specific group with items
    if (groupId && includeItems) {
      console.log(`🔍 Fetching items for group: ${groupId} of type: ${metadataType}`);
      
      let endpoint = '';
      let itemsField = '';
      
      switch (metadataType) {
        case 'dataElements':
          endpoint = `/dataElementGroups/${groupId}`;
          itemsField = 'dataElements[id,name,displayName]';
          break;
        case 'indicators':
          endpoint = `/indicatorGroups/${groupId}`;
          itemsField = 'indicators[id,name,displayName]';
          break;
        case 'programIndicators':
          return NextResponse.json({
            success: false,
            error: 'Program indicators do not have groups in the traditional sense'
          }, { status: 400 });
        default:
          return NextResponse.json({
            success: false,
            error: `Unsupported metadata type: ${metadataType}`
          }, { status: 400 });
      }

      try {
        const response = await dhis2Client.axiosInstance.get(endpoint, {
          params: { fields: `id,name,displayName,${itemsField}` }
        });

        const group = response.data;
        const items = group[metadataType] || [];

        return NextResponse.json({
          success: true,
          data: {
            group: {
              id: group.id,
              name: group.name,
              displayName: group.displayName,
              itemCount: items.length,
              items
            }
          }
        });
      } catch (error: any) {
        console.error('❌ Error fetching group items:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to fetch group items: ${error.message}`
        }, { status: 500 });
      }
    }

    // Fetch groups based on metadata type
    console.log(`🔍 Fetching metadata groups for type: ${metadataType}`);
    
    let endpoint = '';
    let itemsField = '';
    let responseKey = '';
    
    switch (metadataType) {
      case 'dataElements':
        endpoint = '/dataElementGroups';
        itemsField = 'dataElements~size';
        responseKey = 'dataElementGroups';
        break;
      case 'indicators':
        endpoint = '/indicatorGroups';
        itemsField = 'indicators~size';
        responseKey = 'indicatorGroups';
        break;
      case 'programIndicators':
        // For program indicators, we fetch programs instead
        endpoint = '/programs';
        itemsField = 'programIndicators~size';
        responseKey = 'programs';
        break;
      case 'dataElementGroups':
        endpoint = '/dataElementGroups';
        itemsField = 'dataElements~size';
        responseKey = 'dataElementGroups';
        break;
      case 'indicatorGroups':
        endpoint = '/indicatorGroups';
        itemsField = 'indicators~size';
        responseKey = 'indicatorGroups';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported metadata type: ${metadataType}`
        }, { status: 400 });
    }

    const fields = includeItems 
      ? `id,name,displayName,${itemsField},${metadataType}[id,name,displayName]`
      : `id,name,displayName,${itemsField}`;

    try {
      const response = await dhis2Client.axiosInstance.get(endpoint, {
        params: {
          fields,
          pageSize: 100,
          order: 'name:asc'
        }
      });

      const groups: MetadataGroup[] = (response.data[responseKey] || []).map((group: any) => {
        const itemCount = metadataType === 'programIndicators' 
          ? group.programIndicators || 0
          : group[metadataType] || 0;
        
        return {
          id: group.id,
          name: group.name,
          displayName: group.displayName,
          itemCount: typeof itemCount === 'number' ? itemCount : (itemCount.length || 0),
          ...(includeItems && {
            items: group[metadataType] || []
          })
        };
      });

      console.log(`✅ Found ${groups.length} groups for type: ${metadataType}`);

      return NextResponse.json({
        success: true,
        data: {
          groups,
          total: groups.length,
          metadataType,
          instance: {
            id: instance.id,
            name: instance.name,
            version: instance.version
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Error fetching metadata groups:', error);
      
      // Fallback to mock data if API fails
      const mockGroups: MetadataGroup[] = [
        {
          id: 'mock-group-1',
          name: `Sample ${metadataType} Group 1`,
          displayName: `Sample ${metadataType} Group 1`,
          itemCount: 15
        },
        {
          id: 'mock-group-2',
          name: `Sample ${metadataType} Group 2`,
          displayName: `Sample ${metadataType} Group 2`,
          itemCount: 8
        }
      ];

      console.log('⚠️ Using mock groups due to API error');

      return NextResponse.json({
        success: true,
        data: {
          groups: mockGroups,
          total: mockGroups.length,
          metadataType,
          instance: {
            id: instance.id,
            name: instance.name,
            version: instance.version
          },
          fallback: true,
          error: `API connection failed: ${error.message}`
        }
      });
    }

  } catch (error: unknown) {
    console.error('❌ Unexpected error in metadata groups API:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 