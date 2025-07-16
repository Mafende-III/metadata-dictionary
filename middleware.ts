import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Continue with the request
  const response = NextResponse.next();
  
  // Add response time header
  const responseTime = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${responseTime}ms`);
  
  // Add client IP to headers for API routes to use
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  response.headers.set('X-Client-IP', clientIP);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};