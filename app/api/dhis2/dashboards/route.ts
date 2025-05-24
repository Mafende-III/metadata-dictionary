import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService, SessionService } from '../../../../lib/supabase';
import { Dashboard, MetadataFilter } from '../../../../types/metadata';

// Handle GET request to fetch dashboards or a specific dashboard
export async function GET(req: NextRequest) {
  try {
    // Get session ID from query params
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    // Validate session
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 401 }
      );
    }
    
    // Get session from Supabase
    const session = await SessionService.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    // Create DHIS2 client from session
    const dhis2Client = DHIS2Client.fromSession(session);

    // Check if we're fetching a specific dashboard by ID
    const id = searchParams.get('id');
    
    if (id) {
      // FETCH SPECIFIC DASHBOARD BY ID
      
      // Check if we have a cached response
      const cachedResponse = await CacheService.getCachedMetadata<Dashboard>(
        session.id,
        'DASHBOARD',
        id
      );
      
      // If we have a valid cache, return it
      if (cachedResponse.found && !cachedResponse.expired) {
        return NextResponse.json({
          metadata: cachedResponse.item?.metadata,
          quality: cachedResponse.item?.qualityAssessment,
        });
      }
      
      // Fetch dashboard from DHIS2
      const dashboard = await dhis2Client.getMetadataById('DASHBOARD', id);
      
      // Assess quality
      const qualityAssessment = QualityAssessmentService.assessMetadata(
        dashboard,
        'DASHBOARD'
      );
      
      // Cache the result
      await CacheService.cacheMetadata(
        session.id,
        'DASHBOARD',
        dashboard,
        qualityAssessment
      );
      
      // Return the processed data
      return NextResponse.json({
        metadata: dashboard,
        quality: qualityAssessment,
      });
    } else {
      // FETCH LIST OF DASHBOARDS
      
      // Build filters from query params
      const filters: MetadataFilter = {
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
        pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
        sortBy: searchParams.get('sortBy') || undefined,
        sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || undefined,
      };
      
      // Check if we have a cached response
      const cacheKey = `dashboards-${JSON.stringify(filters)}`;
      const cachedResponse = await CacheService.getCachedMetadata<Dashboard>(
        session.id,
        'DASHBOARD',
        cacheKey
      );
      
      // If we have a valid cache, return it
      if (cachedResponse.found && !cachedResponse.expired) {
        return NextResponse.json({
          items: [cachedResponse.item],
          pager: {
            page: filters.page || 1,
            pageCount: 1,
            total: 1,
            pageSize: filters.pageSize || 50,
          },
        });
      }
      
      // Fetch dashboards from DHIS2
      const response = await dhis2Client.getDashboards(filters);
      
      // Extract dashboards and map to our format
      const dashboards = response.dashboards || [];
      
      // Process each dashboard and add quality assessment
      const processedElements = dashboards.map(dashboard => {
        // Assess quality
        const qualityAssessment = QualityAssessmentService.assessMetadata(
          dashboard,
          'DASHBOARD'
        );
        
        // Return combined object
        return {
          metadata: dashboard,
          quality: qualityAssessment,
        };
      });
      
      // Return the processed data
      return NextResponse.json({
        items: processedElements,
        pager: response.pager,
      });
    }
  } catch (error: any) {
    console.error('Error fetching dashboards:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
} 