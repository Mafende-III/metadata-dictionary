import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService, SessionService } from '../../../../lib/supabase';
import { Dashboard, MetadataFilter } from '../../../../types/metadata';
import { getSession } from '../../../../lib/services/sessionService';

// Handle GET request to fetch dashboards or a specific dashboard
export async function GET(req: NextRequest) {
  try {
    // Get session ID from query params
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    let dhis2Client: DHIS2Client | null = null;
    let authSource = 'none';
    
    // Check for sessionId parameter first (consistent with proxy API endpoint)
    if (sessionId) {
      try {
        const session = await SessionService.getSession(sessionId);
        if (session) {
          // Session from Supabase doesn't have token, so we need auth header
          const authHeader = req.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Basic ')) {
            const token = authHeader.replace('Basic ', '');
            dhis2Client = new DHIS2Client(session.serverUrl, token);
            authSource = 'supabase-session-with-auth-header';
            console.log(`🔐 Using Supabase session with auth header for ${session.serverUrl}`);
          }
        }
      } catch (error) {
        console.error('Error retrieving session:', error);
      }
    }
    
    // If no client yet, try to get session from cookies
    if (!dhis2Client) {
      try {
        const session = await getSession();
        if (session && session.token && session.serverUrl) {
          dhis2Client = DHIS2Client.fromSession(session);
          authSource = 'cookie-session';
          console.log(`🔐 Using cookie session for ${session.serverUrl} (user: ${session.username})`);
        }
      } catch (error) {
        console.error('Error getting session from cookies:', error);
      }
    }
    
    // If still no client, try to get credentials from request headers
    if (!dhis2Client) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Basic ')) {
        const token = authHeader.replace('Basic ', '');
        const baseUrl = req.headers.get('x-dhis2-base-url') || 
                       process.env.NEXT_PUBLIC_DHIS2_BASE_URL;
        if (baseUrl) {
          dhis2Client = new DHIS2Client(baseUrl, token);
          authSource = 'auth-header-with-base-url';
          console.log(`🔐 Using auth header with provided base URL: ${baseUrl}`);
        }
      }
    }
    
    // Return error if no valid authentication found
    if (!dhis2Client) {
      console.error('❌ No valid authentication found for dashboards request');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: 'No valid DHIS2 credentials found. Please ensure you are logged in.',
          availableAuthMethods: [
            'sessionId parameter with Authorization header',
            'Valid session in cookies',
            'Authorization header with x-dhis2-base-url header'
          ]
        },
        { status: 401 }
      );
    }

    console.log(`✅ Dashboards authenticated via: ${authSource}`);

    // Check if we're fetching a specific dashboard by ID
    const id = searchParams.get('id');
    
    if (id) {
      // Fetch single dashboard
      const dashboard = await dhis2Client.getDashboard(id);
      
      if (!dashboard) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        );
      }
      
      // Get or create quality assessment
      const qualityAssessment = QualityAssessmentService.assessMetadata(dashboard, 'DASHBOARD');
      
      return NextResponse.json({
        metadata: dashboard,
        quality: qualityAssessment,
      });
    } else {
      // Fetch list of dashboards with pagination and filtering
      const filters: MetadataFilter = {
        search: searchParams.get('search') || '',
        page: Number(searchParams.get('page')) || 1,
        pageSize: Number(searchParams.get('pageSize')) || 50,
        sortBy: searchParams.get('sortBy') || 'displayName',
        sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc',
      };
      
      // Get dashboards
      const response = await dhis2Client.getDashboards(filters);
      
      // Process and assess quality for each dashboard
      const metadataWithQuality = await Promise.all(
        response.dashboards.map(async (dashboard) => {
          // Check cache first
          const cacheResult = await CacheService.getCachedMetadata<Dashboard>(
            sessionId || 'cookie-session',
            'DASHBOARD',
            dashboard.id
          );
          
          if (cacheResult.found && !cacheResult.expired) {
            return {
              metadata: cacheResult.item!.metadata,
              quality: cacheResult.item!.qualityAssessment,
            };
          }
          
          // Assess quality
          const qualityAssessment = QualityAssessmentService.assessMetadata(dashboard, 'DASHBOARD');
          
          // Cache the result
          try {
            await CacheService.cacheMetadata(
              sessionId || 'cookie-session',
              'DASHBOARD',
              dashboard,
              qualityAssessment
            );
          } catch (cacheError) {
            console.warn('Failed to cache metadata:', cacheError);
          }
          
          return {
            metadata: dashboard,
            quality: qualityAssessment,
          };
        })
      );
      
      return NextResponse.json({
        items: metadataWithQuality,
        pager: response.pager,
      });
    }
  } catch (error: any) {
    console.error('Error in dashboards API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboards' },
      { status: error.httpStatusCode || 500 }
    );
  }
} 