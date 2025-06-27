import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { InstanceService } from '../../../../lib/services/instanceService';

interface SqlViewOption {
  id: string;
  name: string;
  displayName: string;
  type: string;
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    console.log('🔍 SQL views request for instance:', instanceId);

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

    // Create DHIS2 client with instance credentials
    const dhis2Client = new DHIS2Client(instance.base_url);
    dhis2Client.setCredentials(credentials.username, credentials.password);

    console.log(`🔐 Fetching SQL views from: ${instance.name} (${instance.base_url})`);

    try {
      const response = await dhis2Client.axiosInstance.get('/sqlViews', {
        params: {
          fields: 'id,name,displayName,type,description,cacheStrategy',
          pageSize: 100,
          order: 'name:asc'
        }
      });

      console.log('🔍 Raw API response:', {
        status: response.status,
        dataKeys: Object.keys(response.data),
        pager: response.data.pager,
        sqlViewsCount: response.data.sqlViews?.length || 0,
        isArray: Array.isArray(response.data),
        dataType: typeof response.data
      });

      // Handle both object and array responses from different DHIS2 configurations
      let sqlViewsData = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response (some DHIS2 instances return this)
        console.log('📋 Processing direct array response with', response.data.length, 'items');
        sqlViewsData = response.data;
      } else if (response.data.sqlViews && Array.isArray(response.data.sqlViews)) {
        // Standard object response with sqlViews array
        console.log('📋 Processing standard object response with', response.data.sqlViews.length, 'SQL views');
        sqlViewsData = response.data.sqlViews;
      } else {
        // Unexpected format
        console.warn('⚠️ Unexpected response format:', typeof response.data);
        sqlViewsData = [];
      }

      const sqlViews: SqlViewOption[] = sqlViewsData.map((view: any) => {
        // Categorize SQL views based on naming patterns
        let category = 'general';
        const name = (view.name || view.displayName || '').toLowerCase();
        
        if (name.includes('data') && name.includes('element')) {
          category = 'dataElements';
        } else if (name.includes('indicator')) {
          category = 'indicators';
        } else if (name.includes('program')) {
          category = 'programIndicators';
        } else if (name.includes('org') || name.includes('unit')) {
          category = 'organisationUnits';
        }
        
        return {
          id: view.id,
          name: view.name || view.displayName,
          displayName: view.displayName || view.name,
          type: view.type || 'VIEW',
          category
        };
      });

      console.log(`✅ Found ${sqlViews.length} SQL views`);

      // Group SQL views by category
      const groupedViews = {
        dataElements: sqlViews.filter(v => v.category === 'dataElements'),
        indicators: sqlViews.filter(v => v.category === 'indicators'),
        programIndicators: sqlViews.filter(v => v.category === 'programIndicators'),
        organisationUnits: sqlViews.filter(v => v.category === 'organisationUnits'),
        general: sqlViews.filter(v => v.category === 'general')
      };

      // Determine total count
      const totalCount = Array.isArray(response.data) 
        ? response.data.length 
        : (response.data.pager?.total || sqlViews.length);

      console.log(`📊 Total SQL views processed: ${totalCount}, Categorized: ${sqlViews.length}`);

      return NextResponse.json({
        success: true,
        data: {
          sqlViews,
          groupedViews,
          total: totalCount,
          instance: {
            id: instance.id,
            name: instance.name,
            version: instance.version
          },
          responseType: Array.isArray(response.data) ? 'array' : 'object'
        }
      });

    } catch (error: any) {
      console.error('❌ Error fetching SQL views:', error);
      
      // Fallback to mock SQL views if API fails
      const mockSqlViews: SqlViewOption[] = [
        {
          id: 'YN8eFwDcO0r',
          name: 'Active Data Elements',
          displayName: 'Active Data Elements with Quality Scores',
          type: 'MATERIALIZED_VIEW',
          category: 'dataElements'
        },
        {
          id: 'ABC123XYZ',
          name: 'Data Element Completeness',
          displayName: 'Data Element Completeness Assessment',
          type: 'MATERIALIZED_VIEW',
          category: 'dataElements'
        },
        {
          id: 'IND456ABC',
          name: 'Indicators with Formulas',
          displayName: 'All Indicators with Numerator/Denominator',
          type: 'MATERIALIZED_VIEW',
          category: 'indicators'
        },
        {
          id: 'TRK123ABC',
          name: 'Tracked Entity Attributes',
          displayName: 'TEA with Value Types and Options',
          type: 'MATERIALIZED_VIEW',
          category: 'programIndicators'
        }
      ];

      const groupedViews = {
        dataElements: mockSqlViews.filter(v => v.category === 'dataElements'),
        indicators: mockSqlViews.filter(v => v.category === 'indicators'),
        programIndicators: mockSqlViews.filter(v => v.category === 'programIndicators'),
        organisationUnits: [],
        general: []
      };

      console.log('⚠️ Using mock SQL views due to API error');

      return NextResponse.json({
        success: true,
        data: {
          sqlViews: mockSqlViews,
          groupedViews,
          total: mockSqlViews.length,
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
    console.error('❌ Unexpected error in SQL views API:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 