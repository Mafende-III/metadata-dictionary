import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        success: false,
        error: 'Supabase not initialized',
        message: 'Check your environment variables'
      }, { status: 500 });
    }

    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('dhis2_sessions')
      .select('count(*)')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        success: false,
        error: error.message,
        message: 'Database connection failed'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Connection test failed'
    }, { status: 500 });
  }
}