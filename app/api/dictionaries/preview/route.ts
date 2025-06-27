import { NextRequest, NextResponse } from 'next/server';
import { InstanceService } from '@/lib/services/instanceService';
import { SqlViewService } from '@/lib/services/sqlViewService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      instance_id, 
      sql_view_id, 
      metadata_type, 
      group_id,
      dictionary_name 
    } = body;

    if (!instance_id || !sql_view_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: instance_id and sql_view_id'
      }, { status: 400 });
    }

    console.log(`🔍 Previewing SQL view: ${sql_view_id} for instance: ${instance_id}`);

    // Get instance details
    const instance = await InstanceService.getInstance(instance_id);
    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    // Get instance credentials
    const credentials = await InstanceService.getInstanceCredentials(instance_id);
    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get instance credentials'
      }, { status: 500 });
    }

    console.log(`🔗 Using instance: ${instance.name} (${instance.base_url})`);
    console.log(`🔐 Using credentials for user: ${credentials.username}`);

    // Initialize SQL View Service with proper authentication
    const sqlViewService = new SqlViewService(instance.base_url, credentials.username, credentials.password);

    // Execute SQL view to get preview data
    console.log(`🔍 Executing SQL view for preview: ${sql_view_id}`);
    
    try {
      const sqlResult = await sqlViewService.executeView(sql_view_id, {
        format: 'json',
        cache: false,
        useCache: false,
        pageSize: 100 // Limit preview to first 100 rows
      });

      if (!sqlResult.data || sqlResult.data.length === 0) {
        console.warn('⚠️ SQL view returned no data');
        return NextResponse.json({
          success: true,
          data: {
            preview_id: `preview_${Date.now()}`,
            dictionary_name: dictionary_name || 'Unnamed Dictionary',
            instance_name: instance.name,
            metadata_type,
            sql_view_id,
            group_id,
            raw_data: [],
            headers: sqlResult.headers || [],
            row_count: 0,
            preview_count: 0,
            status: 'empty',
            created_at: new Date().toISOString()
          }
        });
      }

      console.log(`✅ SQL view preview successful: ${sqlResult.data.length} rows returned`);

      // Create preview data structure
      const previewData = {
        preview_id: `preview_${Date.now()}`,
        dictionary_name: dictionary_name || 'Unnamed Dictionary',
        instance_id,
        instance_name: instance.name,
        metadata_type,
        sql_view_id,
        group_id,
        raw_data: sqlResult.data,
        headers: sqlResult.headers,
        row_count: sqlResult.metadata.rowCount,
        preview_count: sqlResult.data.length,
        status: 'ready',
        execution_time: sqlResult.metadata.executionTime,
        created_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: previewData
      });
      
    } catch (sqlError) {
      console.error('❌ SQL view execution failed:', sqlError);
      
      // Return specific error information
      const errorDetails = sqlError instanceof Error ? sqlError.message : String(sqlError);
      
      return NextResponse.json({
        success: false,
        error: 'SQL view execution failed',
        details: errorDetails,
        debug: {
          instance_url: instance.base_url,
          sql_view_id,
          username: credentials.username
        }
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('❌ Error in dictionary preview:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to preview dictionary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 