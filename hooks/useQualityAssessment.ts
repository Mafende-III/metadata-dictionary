import { useState, useCallback } from 'react';
import axios from 'axios';
import { BaseMetadata, QualityAssessment } from '../types/metadata';
import { Session } from '../types/auth';
import { API_ROUTES } from '../lib/constants';
import { QualityAssessmentService } from '../lib/quality-assessment';

// Quality assessment state
interface QualityState {
  assessment: QualityAssessment | null;
  isLoading: boolean;
  error: string | null;
}

// Default quality state
const defaultQualityState: QualityState = {
  assessment: null,
  isLoading: false,
  error: null,
};

// Hook for quality assessment
export const useQualityAssessment = (session: Session | null) => {
  const [state, setState] = useState<QualityState>(defaultQualityState);
  
  // Assess metadata quality
  const assessMetadataQuality = useCallback(
    async <T extends BaseMetadata>(metadata: T, metadataType: string): Promise<QualityAssessment> => {
      setState({ assessment: null, isLoading: true, error: null });
      
      try {
        if (!session) {
          throw new Error('Authentication required');
        }
        
        // First check if we have an existing assessment on the server
        const response = await axios.get(`${API_ROUTES.METADATA.QUALITY}/${metadata.id}`, {
          params: {
            metadataType,
            sessionId: session.id,
          },
        });
        
        if (response.data) {
          setState({
            assessment: response.data,
            isLoading: false,
            error: null,
          });
          return response.data;
        }
        
        // If no existing assessment, create a new one
        const newAssessment = QualityAssessmentService.assessMetadata(metadata, metadataType);
        
        // Store the assessment
        await axios.post(API_ROUTES.METADATA.QUALITY, {
          assessment: newAssessment,
          sessionId: session.id,
        });
        
        setState({
          assessment: newAssessment,
          isLoading: false,
          error: null,
        });
        
        return newAssessment;
      } catch (error: any) {
        console.error('Error assessing quality:', error);
        
        // Fallback to client-side assessment if API fails
        const fallbackAssessment = QualityAssessmentService.assessMetadata(metadata, metadataType);
        
        setState({
          assessment: fallbackAssessment,
          isLoading: false,
          error: error.message || 'Failed to assess quality',
        });
        
        return fallbackAssessment;
      }
    },
    [session]
  );
  
  // Get improvement recommendations
  const getRecommendations = useCallback((assessment: QualityAssessment): string[] => {
    return QualityAssessmentService.getRecommendations(assessment);
  }, []);
  
  // Get quality color
  const getQualityColor = useCallback((assessment: QualityAssessment): string => {
    return QualityAssessmentService.getBadgeColor(assessment.qualityScore);
  }, []);
  
  // Get quality label
  const getQualityLabel = useCallback((assessment: QualityAssessment): string => {
    return QualityAssessmentService.getQualityLabel(assessment.qualityScore);
  }, []);
  
  return {
    assessment: state.assessment,
    isLoading: state.isLoading,
    error: state.error,
    assessMetadataQuality,
    getRecommendations,
    getQualityColor,
    getQualityLabel,
  };
}; 