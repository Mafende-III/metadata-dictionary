import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService, SessionService } from '../../../../lib/supabase';
import { Indicator, MetadataFilter } from '../../../../types/metadata';

// Handle GET request to fetch indicators or a specific indicator
export async function GET(req: NextRequest, context?: { params?: { id?: string } }) {
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

    // Check if we're fetching a specific indicator by ID
    const id = context?.params?.id || searchParams.get('id');
    
    if (id) {
      // FETCH SPECIFIC INDICATOR BY ID
      
      // Check if we have a cached response
      const cachedResponse = await CacheService.getCachedMetadata<Indicator>(
        session.id,
        'INDICATOR',
        id
      );
      
      // If we have a valid cache, return it
      if (cachedResponse.found && !cachedResponse.expired) {
        return NextResponse.json({
          metadata: cachedResponse.item?.metadata,
          quality: cachedResponse.item?.qualityAssessment,
        });
      }
      
      // Fetch indicator from DHIS2
      const indicator = await dhis2Client.getMetadataById('INDICATOR', id);
      
      // Assess quality
      const qualityAssessment = QualityAssessmentService.assessMetadata(
        indicator,
        'INDICATOR'
      );
      
      // Cache the result
      await CacheService.cacheMetadata(
        session.id,
        'INDICATOR',
        indicator,
        qualityAssessment
      );
      
      // Return the processed data
      return NextResponse.json({
        metadata: indicator,
        quality: qualityAssessment,
      });
    } else {
      // FETCH LIST OF INDICATORS
      
      // Build filters from query params
      const filters: MetadataFilter = {
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
        pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
        sortBy: searchParams.get('sortBy') || undefined,
        sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || undefined,
      };
      
      // Check if we have a cached response
      const cacheKey = `indicators-${JSON.stringify(filters)}`;
      const cachedResponse = await CacheService.getCachedMetadata<Indicator>(
        session.id,
        'INDICATOR',
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
      
      // Fetch indicators from DHIS2
      const response = await dhis2Client.getIndicators(filters);
      
      // Extract indicators and map to our format
      const indicators = response.indicators || [];
      
      // Process each indicator and add quality assessment
      const processedElements = indicators.map(indicator => {
        // Assess quality
        const qualityAssessment = QualityAssessmentService.assessMetadata(
          indicator,
          'INDICATOR'
        );
        
        // Return combined object
        return {
          metadata: indicator,
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
    console.error('Error fetching indicators:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch indicators' },
      { status: 500 }
    );
  }
} 