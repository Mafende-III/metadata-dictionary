import { BaseMetadata, QualityAssessment } from '../types/metadata';

// Quality assessment criteria
export enum QualityCriteria {
  HAS_DESCRIPTION = 'hasDescription',
  HAS_CODE = 'hasCode',
  HAS_ACTIVITY_STATUS = 'hasActivityStatus',
  RECENTLY_UPDATED = 'recentlyUpdated'
}

// Quality score color
export enum QualityColor {
  POOR = 'red',
  FAIR = 'orange',
  GOOD = 'yellow',
  VERY_GOOD = 'green',
  EXCELLENT = 'blue'
}

// Quality assessment service
export class QualityAssessmentService {
  // Assess metadata quality
  static assessMetadata(metadata: BaseMetadata, metadataType: string): QualityAssessment {
    const hasDescription = this.checkDescription(metadata);
    const hasCode = this.checkCode(metadata);
    const hasActivityStatus = this.checkActivityStatus(metadata);
    const recentlyUpdated = this.checkRecency(metadata);
    
    const qualityScore = this.calculateScore({
      hasDescription,
      hasCode,
      hasActivityStatus,
      recentlyUpdated
    });
    
    return {
      id: `qa-${metadata.id}`,
      metadataId: metadata.id,
      metadataType: metadataType as any,
      hasDescription,
      hasCode,
      hasActivityStatus,
      recentlyUpdated,
      qualityScore,
      assessedAt: new Date().toISOString()
    };
  }
  
  // Check if metadata has a meaningful description
  private static checkDescription(metadata: BaseMetadata): boolean {
    if (!metadata.description) {
      return false;
    }
    
    // Check if description is meaningful (more than just a few characters)
    return metadata.description.trim().length > 10;
  }
  
  // Check if metadata has a code
  private static checkCode(metadata: BaseMetadata): boolean {
    return !!metadata.code && metadata.code.trim().length > 0;
  }
  
  // Check if metadata is actively used
  private static checkActivityStatus(metadata: BaseMetadata): boolean {
    // For now, we assume it's active if it has been updated in the past year
    return this.checkRecency(metadata);
  }
  
  // Check if metadata has been recently updated (within 1 year)
  private static checkRecency(metadata: BaseMetadata): boolean {
    if (!metadata.lastUpdated) {
      return false;
    }
    
    const lastUpdated = new Date(metadata.lastUpdated);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return lastUpdated >= oneYearAgo;
  }
  
  // Calculate overall quality score (0-4)
  private static calculateScore(criteria: {
    hasDescription: boolean;
    hasCode: boolean;
    hasActivityStatus: boolean;
    recentlyUpdated: boolean;
  }): number {
    let score = 0;
    
    if (criteria.hasDescription) score += 1;
    if (criteria.hasCode) score += 1;
    if (criteria.hasActivityStatus) score += 1;
    if (criteria.recentlyUpdated) score += 1;
    
    return score;
  }
  
  // Get badge color based on quality score
  static getBadgeColor(score: number): QualityColor {
    if (score === 0) return QualityColor.POOR;
    if (score === 1) return QualityColor.FAIR;
    if (score === 2) return QualityColor.GOOD;
    if (score === 3) return QualityColor.VERY_GOOD;
    return QualityColor.EXCELLENT;
  }
  
  // Get quality label based on score
  static getQualityLabel(score: number): string {
    if (score === 0) return 'Poor';
    if (score === 1) return 'Fair';
    if (score === 2) return 'Good';
    if (score === 3) return 'Very Good';
    return 'Excellent';
  }
  
  // Get improvement recommendations based on assessment
  static getRecommendations(assessment: QualityAssessment): string[] {
    const recommendations: string[] = [];
    
    if (!assessment.hasDescription) {
      recommendations.push('Add a meaningful description (>10 characters)');
    }
    
    if (!assessment.hasCode) {
      recommendations.push('Add a code for better identification');
    }
    
    if (!assessment.hasActivityStatus) {
      recommendations.push('Check if this metadata is still actively used');
    }
    
    if (!assessment.recentlyUpdated) {
      recommendations.push('Update the metadata to reflect current requirements');
    }
    
    return recommendations;
  }
} 