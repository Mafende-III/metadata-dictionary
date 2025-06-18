import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear the DHIS2 session cookie
    cookieStore.delete('dhis2_session');
    
    return NextResponse.json({ 
      message: 'Session cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json({ 
      error: 'Failed to clear session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}