import { NextRequest, NextResponse } from 'next/server';
import { InstanceService } from '@/lib/services/instanceService';
import { createDHIS2ClientFromInstance } from '@/lib/utils/dhis2ClientFactory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sqlViewId, instanceId, parameters } = body;

    console.log(`🔍 Incoming request body:`, { sqlViewId, instanceId, parameters });

    if (!sqlViewId || !instanceId || !parameters) {
      console.error(`❌ Missing required fields:`, { sqlViewId, instanceId, parameters });
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: sqlViewId, instanceId, parameters'
      }, { status: 400 });
    }

    console.log(`🔍 Executing parameterized SQL view: ${sqlViewId}`);
    console.log(`📊 Parameters:`, parameters);

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

    // Create DHIS2 client with standardized SSL configuration
    const dhis2Client = await createDHIS2ClientFromInstance(instance, credentials);

    console.log(`🔐 Using instance: ${instance.name} (${instance.base_url})`);

    try {
      // Execute SQL view with parameters
      const queryParams = new URLSearchParams();
      
      // Add parameters to query string (DHIS2 format: var=paramName:value)
      Object.entries(parameters).forEach(([key, value]) => {
        queryParams.append('var', `${key}:${value}`);
      });

      const endpoint = `/sqlViews/${sqlViewId}/data.json?${queryParams.toString()}`;
      console.log(`🔗 Executing: ${endpoint}`);
      console.log(`🔗 Full URL: ${instance.base_url}${endpoint}`);

      const response = await dhis2Client.axiosInstance.get(endpoint);
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response data keys:`, Object.keys(response.data || {}));
      
      if (response.data) {
        console.log(`✅ SQL view executed successfully`);
        
        // Parse DHIS2 listGrid format
        let parsedData = null;
        if (response.data.listGrid) {
          const { headers, rows } = response.data.listGrid;
          
          if (headers && rows) {
            parsedData = rows.map((row: any[]) => {
              const obj: any = {};
              headers.forEach((header: any, index: number) => {
                obj[header.name] = row[index];
              });
              return obj;
            });
          }
        } else if (Array.isArray(response.data)) {
          parsedData = response.data;
        } else {
          parsedData = [response.data];
        }

        return NextResponse.json({
          success: true,
          data: parsedData,
          metadata: {
            sqlViewId,
            parameters,
            instance: {
              id: instance.id,
              name: instance.name,
              base_url: instance.base_url
            },
            executed_at: new Date().toISOString(),
            row_count: parsedData ? parsedData.length : 0
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'No data returned from SQL view'
        }, { status: 404 });
      }

    } catch (apiError: any) {
      console.error('❌ DHIS2 API Error:', apiError.response?.data || apiError.message);
      console.error('❌ Error details:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        config: {
          method: apiError.config?.method,
          url: apiError.config?.url,
          params: apiError.config?.params
        }
      });
      
      return NextResponse.json({
        success: false,
        error: 'SQL view execution failed',
        details: {
          message: apiError.message,
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          endpoint: `/sqlViews/${sqlViewId}/data.json`,
          parameters: parameters
        }
      }, { status: apiError.response?.status || 500 });
    }

  } catch (error: any) {
    console.error('❌ Unexpected error in parameterized SQL view execution:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error.message
    }, { status: 500 });
  }
}