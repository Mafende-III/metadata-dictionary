import { NextRequest, NextResponse } from 'next/server';
import { SqlViewService, SqlViewExecutionOptions } from '@/lib/services/sqlViewService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sqlViewId, options, variables, name, cacheId } = body;
    
    // Create service instance - TODO: Add proper auth when available
    const service = new SqlViewService();

    switch (action) {
      case 'execute':
        const result = variables 
          ? await service.executeQueryView(sqlViewId, variables, options)
          : await service.executeView(sqlViewId, options);
        return NextResponse.json(result);

      case 'refresh':
        await service.refreshMaterializedView(sqlViewId);
        return NextResponse.json({ success: true });

      case 'metadata':
        const metadata = await service.getSqlViewMetadata(sqlViewId);
        return NextResponse.json(metadata);

      case 'extractVariables':
        const vars = service.extractVariables(body.sqlQuery);
        return NextResponse.json({ variables: vars });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('SQL View API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sqlViewId = searchParams.get('id');

    if (!sqlViewId) {
      return NextResponse.json({ error: 'SQL View ID required' }, { status: 400 });
    }

    const service = new SqlViewService();
    const metadata = await service.getSqlViewMetadata(sqlViewId);
    
    return NextResponse.json(metadata);
  } catch (error: unknown) {
    console.error('Failed to get SQL view metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve SQL view metadata', details: errorMessage },
      { status: 500 }
    );
  }
} 