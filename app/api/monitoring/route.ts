import { NextRequest, NextResponse } from 'next/server';
import { accessLogger } from '@/lib/middleware/accessLogger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    
    const stats = await accessLogger.getAccessStats(hours);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get monitoring stats:', error);
    return NextResponse.json(
      { error: 'Failed to get monitoring stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, url, userAgent, referer } = body;
    
    // Log the request
    await accessLogger.logRequest(request);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log request:', error);
    return NextResponse.json(
      { error: 'Failed to log request' },
      { status: 500 }
    );
  }
}