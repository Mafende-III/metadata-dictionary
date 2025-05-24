import { NextRequest, NextResponse } from 'next/server';
import { DHIS2Client } from '../../../../lib/dhis2';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService } from '../../../../lib/supabase';
import { DataElement, MetadataFilter } from '../../../../types/metadata';
import { SessionService } from '../../../../lib/supabase';

// Handle GET request to fetch data elements or a specific data element
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

    // Check if we're fetching a specific data element by ID
    const id = searchParams.get('id');
    
    if (id) {
      // FETCH SPECIFIC DATA ELEMENT BY ID
      
      // Check if we have a cached response
      const cachedResponse = await CacheService.getCachedMetadata<DataElement>(
        session.id,
        'DATA_ELEMENT',
        id
      );
      
      // If we have a valid cache, return it
      if (cachedResponse.found && !cachedResponse.expired) {
        return NextResponse.json({
          metadata: cachedResponse.item?.metadata,
          quality: cachedResponse.item?.qualityAssessment,
        });
      }
      
      // Fetch data element from DHIS2
      const dataElement = await dhis2Client.getMetadataById('DATA_ELEMENT', id);
      
      // Assess quality
      const qualityAssessment = QualityAssessmentService.assessMetadata(
        dataElement,
        'DATA_ELEMENT'
      );
      
      // Cache the result
      await CacheService.cacheMetadata(
        session.id,
        'DATA_ELEMENT',
        dataElement,
        qualityAssessment
      );
      
      // Return the processed data
      return NextResponse.json({
        metadata: dataElement,
        quality: qualityAssessment,
      });
    } else {
      // FETCH LIST OF DATA ELEMENTS
      
      // Build filters from query params
      const filters: MetadataFilter = {
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
        pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
        sortBy: searchParams.get('sortBy') || undefined,
        sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || undefined,
      };
      
      // Check if we have a cached response
      const cacheKey = `data-elements-${JSON.stringify(filters)}`;
      const cachedResponse = await CacheService.getCachedMetadata<DataElement>(
        session.id,
        'DATA_ELEMENT',
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
      
      // Fetch data elements from DHIS2
      const response = await dhis2Client.getDataElements(filters);
      
      // Extract data elements and map to our format
      const dataElements = response.dataElements || [];
      
      // Process each data element and add quality assessment
      const processedElements = dataElements.map(dataElement => {
        // Assess quality
        const qualityAssessment = QualityAssessmentService.assessMetadata(
          dataElement,
          'DATA_ELEMENT'
        );
        
        // Return combined object
        return {
          metadata: dataElement,
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
    console.error('Error fetching data elements:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data elements' },
      { status: 500 }
    );
  }
}