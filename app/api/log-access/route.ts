import { NextRequest, NextResponse } from 'next/server';
import { accessLogger } from '@/lib/middleware/accessLogger';

export async function POST(request: NextRequest) {
  try {
    // Log the request automatically
    await accessLogger.logRequest(request);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log access:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}