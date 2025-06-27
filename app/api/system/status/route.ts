import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Initialize status
    const status = {
      database: 'disconnected',
      dhis2: 'unknown',
      apis: 'unknown',
      timestamp: new Date().toISOString(),
      response_time: 0,
      health: {
        instances: 0,
        sqlViews: 0,
        dictionaries: 0,
        activeProcesses: 0
      },
      version: process.env.npm_package_version || '1.0.0'
    };

    // Test database connection
    try {
      if (!supabase) {
        status.database = 'not_configured';
      } else {
        // Try a simple query to test connection
        const { data, error } = await supabase
          .from('dhis2_instances')
          .select('id, name, version, status, sql_views_count, dictionaries_count')
          .limit(10);

        if (error) {
          console.warn('Database query error:', error.message);
          status.database = 'error';
        } else {
          status.database = 'connected';
          
          // Update health metrics
          if (data && data.length > 0) {
            status.health.instances = data.length;
            status.health.sqlViews = data.reduce((sum, inst) => sum + (inst.sql_views_count || 0), 0);
            status.health.dictionaries = data.reduce((sum, inst) => sum + (inst.dictionaries_count || 0), 0);
          }
        }
      }
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      status.database = 'error';
    }

    // Test DHIS2 connectivity (simplified check)
    try {
      // This is a simplified check - just ensure our DHIS2 API endpoints respond
      const testResponse = await fetch(`${request.nextUrl.origin}/api/dhis2/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: 'https://play.dhis2.org/40/api',
          username: 'test',
          password: 'test'
        })
      });
      
      status.dhis2 = testResponse.ok ? 'api_available' : 'api_error';
    } catch (dhisError) {
      status.dhis2 = 'api_error';
    }

    // API health check
    status.apis = 'working'; // If we got this far, APIs are working

    // Calculate response time
    status.response_time = Date.now() - startTime;

    // Overall health assessment
    const overallHealth = 
      status.database === 'connected' && 
      status.dhis2 !== 'api_error' && 
      status.apis === 'working' ? 'healthy' : 'warning';

    return NextResponse.json({
      success: true,
      status: overallHealth,
      details: status,
      checks: {
        database: status.database === 'connected',
        dhis2: status.dhis2 !== 'api_error', 
        apis: status.apis === 'working'
      }
    });

  } catch (error: unknown) {
    console.error('System status check failed:', error);
    
    return NextResponse.json({
      success: false,
      status: 'error',
      error: 'System status check failed',
      details: {
        database: 'error',
        dhis2: 'error',
        apis: 'error',
        timestamp: new Date().toISOString(),
        response_time: 0,
        health: {
          instances: 0,
          sqlViews: 0,
          dictionaries: 0,
          activeProcesses: 0
        }
      },
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 