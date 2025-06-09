import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService } from '../../../../lib/supabase';
import { DataElement, MetadataFilter } from '../../../../types/metadata';
import { SessionService } from '../../../../lib/supabase';
import { getSession } from '../../../../lib/services/sessionService';

// Handle GET request to fetch data elements or a specific data element
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
      console.error('❌ No valid authentication found for data elements request');
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

    console.log(`✅ Data Elements authenticated via: ${authSource}`);

    // Check if we're fetching a specific data element by ID
    const id = searchParams.get('id');
    
    if (id) {
      // Fetch single data element
      const dataElement = await dhis2Client.getDataElement(id);
      
      if (!dataElement) {
        return NextResponse.json(
          { error: 'Data element not found' },
          { status: 404 }
        );
      }
      
      // Get or create quality assessment
      const qualityAssessment = QualityAssessmentService.assessMetadata(dataElement, 'DATA_ELEMENT');
      
      return NextResponse.json({
        metadata: dataElement,
        quality: qualityAssessment,
      });
    } else {
      // Fetch list of data elements with pagination and filtering
      const filters: MetadataFilter = {
        search: searchParams.get('search') || '',
        page: Number(searchParams.get('page')) || 1,
        pageSize: Number(searchParams.get('pageSize')) || 50,
        sortBy: searchParams.get('sortBy') || 'displayName',
        sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc',
      };
      
      // Get data elements
      const response = await dhis2Client.getDataElements(filters);
      
      // Process and assess quality for each data element
      const metadataWithQuality = await Promise.all(
        response.dataElements.map(async (dataElement) => {
          // Check cache first
          const cacheResult = await CacheService.getCachedMetadata<DataElement>(
            sessionId || 'cookie-session',
            'DATA_ELEMENT',
            dataElement.id
          );
          
          if (cacheResult.found && !cacheResult.expired) {
            return {
              metadata: cacheResult.item!.metadata,
              quality: cacheResult.item!.qualityAssessment,
            };
          }
          
          // Assess quality
          const qualityAssessment = QualityAssessmentService.assessMetadata(dataElement, 'DATA_ELEMENT');
          
          // Cache the result
          try {
            await CacheService.cacheMetadata(
              sessionId || 'cookie-session',
              'DATA_ELEMENT',
              dataElement,
              qualityAssessment
            );
          } catch (cacheError) {
            console.warn('Failed to cache metadata:', cacheError);
          }
          
          return {
            metadata: dataElement,
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
    console.error('Error in data elements API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data elements' },
      { status: error.httpStatusCode || 500 }
    );
  }
}