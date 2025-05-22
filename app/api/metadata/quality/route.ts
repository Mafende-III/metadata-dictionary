import { NextRequest, NextResponse } from 'next/server';
import { QualityAssessmentService } from '../../../../lib/quality-assessment';
import { BaseMetadata, QualityAssessment } from '../../../../types/metadata';
import { supabase } from '../../../../lib/supabase';
import { getSession } from '../../../../lib/utils';

// Handle POST request to assess metadata quality
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { metadata, metadataType, sessionId, assessment } = await req.json();
    
    // Validate request
    if (!metadata || !metadataType || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get session
    const session = getSession();
    
    if (!session || session.id !== sessionId) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    let qualityAssessment: QualityAssessment;
    
    // If an assessment is provided, use it
    if (assessment) {
      qualityAssessment = assessment;
      
      // Store assessment in database
      await storeAssessment(qualityAssessment);
    } else {
      // Otherwise, assess quality
      qualityAssessment = QualityAssessmentService.assessMetadata(
        metadata,
        metadataType
      );
      
      // Store assessment in database
      await storeAssessment(qualityAssessment);
    }
    
    // Return the quality assessment
    return NextResponse.json(qualityAssessment);
  } catch (error: any) {
    console.error('Error assessing metadata quality:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to assess metadata quality' },
      { status: 500 }
    );
  }
}

// Handle GET request to get a quality assessment
export async function GET(req: NextRequest) {
  try {
    // Get metadata ID, type, and session ID from query params
    const { searchParams } = new URL(req.url);
    const metadataId = searchParams.get('metadataId');
    const metadataType = searchParams.get('metadataType');
    const sessionId = searchParams.get('sessionId');
    
    // Validate request
    if (!metadataId || !metadataType || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get session
    const session = getSession();
    
    if (!session || session.id !== sessionId) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    // Check if we have a stored assessment
    const { data, error } = await supabase
      .from('quality_assessments')
      .select('*')
      .eq('metadata_id', metadataId)
      .eq('metadata_type', metadataType)
      .single();
      
    if (error || !data) {
      return NextResponse.json(null);
    }
    
    // Convert database record to QualityAssessment type
    const qualityAssessment: QualityAssessment = {
      id: data.id,
      metadataId: data.metadata_id,
      metadataType: data.metadata_type,
      hasDescription: data.has_description,
      hasCode: data.has_code,
      hasActivityStatus: data.has_activity_status,
      recentlyUpdated: data.recently_updated,
      qualityScore: data.quality_score,
      assessedAt: data.assessed_at,
    };
    
    // Return the quality assessment
    return NextResponse.json(qualityAssessment);
  } catch (error: any) {
    console.error('Error getting quality assessment:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get quality assessment' },
      { status: 500 }
    );
  }
}

// Helper function to store assessment in database
async function storeAssessment(assessment: QualityAssessment): Promise<void> {
  try {
    await supabase
      .from('quality_assessments')
      .upsert({
        id: assessment.id,
        metadata_id: assessment.metadataId,
        metadata_type: assessment.metadataType,
        has_description: assessment.hasDescription,
        has_code: assessment.hasCode,
        has_activity_status: assessment.hasActivityStatus,
        recently_updated: assessment.recentlyUpdated,
        quality_score: assessment.qualityScore,
        assessed_at: assessment.assessedAt,
      });
  } catch (error) {
    console.error('Error storing quality assessment:', error);
    // Continue execution even if storage fails
  }
} 