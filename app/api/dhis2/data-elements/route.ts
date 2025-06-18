import { NextRequest, NextResponse } from 'next/server';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { CacheService } from '../../../../lib/supabase';
import { DataElement, MetadataFilter } from '../../../../types/metadata';
import { withAuth, AuthResult, createErrorResponse, createSuccessResponse } from '../../../../lib/middleware/auth';

// Handle GET request to fetch data elements or a specific data element
async function handleDataElementsRequest(req: NextRequest, auth: AuthResult): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const dhis2Client = auth.client;

    // Check if we're fetching a specific data element by ID
    const id = searchParams.get('id');
    
    if (id) {
      // Fetch single data element
      const dataElement = await dhis2Client.getMetadataById('DATA_ELEMENT', id);
      
      if (!dataElement) {
        return createErrorResponse('Data element not found', undefined, 404);
      }
      
      // Get or create quality assessment
      const qualityAssessment = QualityAssessmentService.assessMetadata(dataElement, 'DATA_ELEMENT');
      
      return createSuccessResponse({
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
      
      // Debug the response structure
      console.log('DHIS2 Response structure:', {
        keys: Object.keys(response || {}),
        hasDataElements: !!response?.dataElements,
        responseType: typeof response
      });
      
      // Handle response structure - DHIS2 returns dataElements array directly in some cases
      const dataElements = response?.dataElements || [];
      
      if (!Array.isArray(dataElements)) {
        console.error('Expected dataElements array, got:', typeof dataElements);
        return createErrorResponse('Invalid response structure from DHIS2 API');
      }
      
      // Process and assess quality for each data element
      const metadataWithQuality = await Promise.all(
        dataElements.map(async (dataElement: DataElement) => {
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
      
      return createSuccessResponse({
        items: metadataWithQuality,
        pager: response.pager,
      });
    }
  } catch (error: unknown) {
    console.error('Error in data elements API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data elements';
    const statusCode = error && typeof error === 'object' && 'httpStatusCode' in error 
      ? (error.httpStatusCode as number) 
      : 500;
    return createErrorResponse(errorMessage, undefined, statusCode);
  }
}

// Export the wrapped handler
export const GET = withAuth(handleDataElementsRequest);