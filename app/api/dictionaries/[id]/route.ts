import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    console.log('🔍 Fetching dictionary:', id);

    // Check if Supabase is available
    if (!supabase) {
      console.warn('⚠️ Supabase not available, returning mock dictionary');
      return NextResponse.json({
        success: true,
        data: {
          id,
          name: 'Mock Dictionary',
          status: 'active',
          description: 'This is mock data because Supabase is not configured.',
          instance_name: 'Demo Instance',
          metadata_type: 'dataElements',
          variables_count: 0,
          quality_average: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    // Try to fetch from database
    const { data, error } = await supabase
      .from('metadata_dictionaries')
      .select(`
        id,
        name,
        description,
        instance_name,
        metadata_type,
        sql_view_id,
        group_id,
        processing_method,
        period,
        version,
        variables_count,
        status,
        quality_average,
        processing_time,
        success_rate,
        error_message,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching dictionary:', error);
      
      // If dictionary not found, return a generating state as fallback
      if (error.code === 'PGRST116') {
        console.log('📝 Dictionary not found in database, returning generating state');
        return NextResponse.json({
          success: true,
          data: {
            id,
            name: 'Generating Dictionary...',
            status: 'generating',
            description: 'This dictionary is currently being generated. Please check back in a few moments.',
            instance_name: 'Processing...',
            metadata_type: 'unknown',
            variables_count: 0,
            quality_average: 0,
            processing_time: null,
            success_rate: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null
          }
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to fetch dictionary',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Dictionary found:', data.name, 'Status:', data.status);

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: unknown) {
    console.error('❌ Unexpected error fetching dictionary:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const updateData = await request.json();

    console.log('🔄 Updating dictionary:', id, 'with:', updateData);

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('metadata_dictionaries')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating dictionary:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update dictionary',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Dictionary updated successfully');

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: unknown) {
    console.error('❌ Unexpected error updating dictionary:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    console.log('🗑️ Deleting dictionary:', id);

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    const { error } = await supabase
      .from('metadata_dictionaries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting dictionary:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete dictionary',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Dictionary deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Dictionary deleted successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Unexpected error deleting dictionary:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 