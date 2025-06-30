import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedSession } from '@/lib/middleware/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; variableId: string }> }
) {
  try {
    const params = await context.params;
    const { id: dictionaryId, variableId } = params;
    const { searchParams } = new URL(request.url);
    
    // Get parameters from query
    const period = searchParams.get('period') || 'THIS_YEAR';
    const orgUnit = searchParams.get('orgUnit') || 'USER_ORGUNIT';

    console.log('🔍 Fetching analytics for variable:', variableId, 'in dictionary:', dictionaryId);

    // Get authenticated session to access DHIS2
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        details: 'Please log in to access DHIS2 analytics data'
      }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 });
    }

    // Check if we have cached analytics data that's still valid
    const cachedData = await getCachedAnalyticsData(dictionaryId, variableId, period, orgUnit);
    if (cachedData && !isExpired(cachedData.cached_at)) {
      console.log('✅ Returning cached analytics data');
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        cached: true,
        cachedAt: cachedData.cached_at
      });
    }

    // Fetch fresh analytics data from DHIS2
    try {
      const analyticsData = await fetchAnalyticsFromDHIS2(session, variableId, period, orgUnit);
      
      // Cache the fresh data
      await cacheAnalyticsData(dictionaryId, variableId, analyticsData, period, orgUnit);
      
      console.log('✅ Fresh analytics data fetched and cached');
      return NextResponse.json({
        success: true,
        data: analyticsData,
        cached: false,
        fetchedAt: new Date().toISOString()
      });
    } catch (dhisError) {
      console.error('❌ Error fetching from DHIS2:', dhisError);
      
      // If we have expired cached data, return it with a warning
      if (cachedData) {
        console.log('⚠️ Returning expired cached data due to DHIS2 error');
        return NextResponse.json({
          success: true,
          data: cachedData.data,
          cached: true,
          expired: true,
          cachedAt: cachedData.cached_at,
          warning: 'Using cached data due to DHIS2 connection issues'
        });
      }
      
      // No cached data available, return error
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analytics data',
        details: dhisError instanceof Error ? dhisError.message : 'DHIS2 API error'
      }, { status: 502 });
    }

  } catch (error: unknown) {
    console.error('❌ Unexpected error in analytics endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get cached analytics data with period and orgUnit parameters
async function getCachedAnalyticsData(dictionaryId: string, variableId: string, period: string, orgUnit: string) {
  if (!supabase) return null;
  
  try {
    const cacheKey = `${variableId}_${period}_${orgUnit}`;
    
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('dictionary_id', dictionaryId)
      .eq('variable_uid', cacheKey)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching cached analytics:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getCachedAnalyticsData:', error);
    return null;
  }
}

// Cache analytics data with enhanced key including period and orgUnit
async function cacheAnalyticsData(dictionaryId: string, variableId: string, data: any, period: string, orgUnit: string) {
  if (!supabase) return;
  
  try {
    const cacheKey = `${variableId}_${period}_${orgUnit}`;
    
    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        dictionary_id: dictionaryId,
        variable_uid: cacheKey,
        data: data,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      });
    
    if (error) {
      console.error('Error caching analytics data:', error);
    } else {
      console.log(`✅ Analytics data cached for ${cacheKey}`);
    }
  } catch (error) {
    console.error('Error in cacheAnalyticsData:', error);
  }
}

// Check if cached data is expired (6 hours)
function isExpired(cachedAt: string): boolean {
  const cached = new Date(cachedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - cached.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 6; // Expire after 6 hours
}

// Fetch analytics data from DHIS2 with enhanced error handling
async function fetchAnalyticsFromDHIS2(session: any, variableId: string, period: string, orgUnit: string) {
  const baseUrl = session.serverUrl;
  const analyticsUrl = `${baseUrl}/analytics?dimension=dx:${variableId}&dimension=pe:${period}&dimension=ou:${orgUnit}&displayProperty=NAME&outputFormat=JSON&skipRounding=false`;
  
  console.log('📊 Fetching analytics from:', analyticsUrl);
  
  const response = await fetch(analyticsUrl, {
    headers: {
      'Authorization': session.authHeader,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DHIS2 Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Validate the response structure
  if (!data.headers || !Array.isArray(data.headers)) {
    throw new Error('Invalid analytics response: missing or invalid headers');
  }
  
  if (!data.rows || !Array.isArray(data.rows)) {
    console.warn('⚠️ Analytics response has no data rows');
    data.rows = [];
  }
  
  // Add metadata about the request
  data.requestInfo = {
    variableId,
    period,
    orgUnit,
    fetchedAt: new Date().toISOString(),
    url: analyticsUrl
  };
  
  console.log(`✅ Fetched analytics: ${data.rows.length} data points`);
  
  return data;
} 