/**
 * Feature Flags for Enhanced Export Implementation
 * 
 * This module provides a safe way to enable/disable enhanced export features
 * with comprehensive rollback capabilities and error tracking.
 */

interface FeatureFlag {
  enabled: boolean;
  version: string;
  rollbackVersion?: string;
  enabledAt?: string;
  disabledAt?: string;
  errorThreshold?: number;
  errorCount?: number;
  lastError?: string;
  lastErrorAt?: string;
}

interface FeatureFlags {
  enhancedExport: FeatureFlag;
  groupValidation: FeatureFlag;
  dynamicColumns: FeatureFlag;
  enhancedApiUrls: FeatureFlag;
  exportFormatEnhancements: FeatureFlag;
}

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enhancedExport: {
    enabled: true,
    version: '1.0.0',
    rollbackVersion: 'legacy',
    enabledAt: new Date().toISOString(),
    errorThreshold: 10,
    errorCount: 0
  },
  groupValidation: {
    enabled: true,
    version: '1.0.0',
    rollbackVersion: 'disabled',
    enabledAt: new Date().toISOString(),
    errorThreshold: 5,
    errorCount: 0
  },
  dynamicColumns: {
    enabled: true,
    version: '1.0.0',
    rollbackVersion: 'basic',
    enabledAt: new Date().toISOString(),
    errorThreshold: 8,
    errorCount: 0
  },
  enhancedApiUrls: {
    enabled: true,
    version: '1.0.0',
    rollbackVersion: 'basic',
    enabledAt: new Date().toISOString(),
    errorThreshold: 15,
    errorCount: 0
  },
  exportFormatEnhancements: {
    enabled: true,
    version: '1.0.0',
    rollbackVersion: 'legacy',
    enabledAt: new Date().toISOString(),
    errorThreshold: 12,
    errorCount: 0
  }
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private readonly STORAGE_KEY = 'enhanced_export_feature_flags';

  constructor() {
    this.flags = this.loadFlags();
  }

  /**
   * Load feature flags from storage or use defaults
   */
  private loadFlags(): FeatureFlags {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsedFlags = JSON.parse(stored);
          return { ...DEFAULT_FEATURE_FLAGS, ...parsedFlags };
        }
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
    
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  /**
   * Save feature flags to storage
   */
  private saveFlags(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.flags));
      }
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureName: keyof FeatureFlags): boolean {
    const flag = this.flags[featureName];
    return flag ? flag.enabled : false;
  }

  /**
   * Get feature flag details
   */
  getFlag(featureName: keyof FeatureFlags): FeatureFlag | null {
    return this.flags[featureName] || null;
  }

  /**
   * Enable a feature flag
   */
  enable(featureName: keyof FeatureFlags): void {
    if (this.flags[featureName]) {
      this.flags[featureName].enabled = true;
      this.flags[featureName].enabledAt = new Date().toISOString();
      this.flags[featureName].disabledAt = undefined;
      this.saveFlags();
      
      console.log(`✅ Feature '${featureName}' enabled`);
    }
  }

  /**
   * Disable a feature flag
   */
  disable(featureName: keyof FeatureFlags, reason?: string): void {
    if (this.flags[featureName]) {
      this.flags[featureName].enabled = false;
      this.flags[featureName].disabledAt = new Date().toISOString();
      this.flags[featureName].lastError = reason;
      this.flags[featureName].lastErrorAt = new Date().toISOString();
      this.saveFlags();
      
      console.warn(`⚠️ Feature '${featureName}' disabled. Reason: ${reason || 'Manual disable'}`);
    }
  }

  /**
   * Record an error for a feature flag
   */
  recordError(featureName: keyof FeatureFlags, error: string): void {
    const flag = this.flags[featureName];
    if (!flag) return;

    flag.errorCount = (flag.errorCount || 0) + 1;
    flag.lastError = error;
    flag.lastErrorAt = new Date().toISOString();

    console.error(`❌ Error recorded for feature '${featureName}': ${error}`);

    // Auto-disable if error threshold exceeded
    if (flag.errorThreshold && flag.errorCount >= flag.errorThreshold) {
      this.disable(featureName, `Auto-disabled: Error threshold (${flag.errorThreshold}) exceeded`);
    }

    this.saveFlags();
  }

  /**
   * Reset error count for a feature flag
   */
  resetErrors(featureName: keyof FeatureFlags): void {
    const flag = this.flags[featureName];
    if (flag) {
      flag.errorCount = 0;
      flag.lastError = undefined;
      flag.lastErrorAt = undefined;
      this.saveFlags();
      
      console.log(`🔄 Error count reset for feature '${featureName}'`);
    }
  }

  /**
   * Get all feature flags status
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Rollback to previous version
   */
  rollback(featureName: keyof FeatureFlags): void {
    const flag = this.flags[featureName];
    if (flag && flag.rollbackVersion) {
      this.disable(featureName, `Rolled back to version: ${flag.rollbackVersion}`);
      console.warn(`🔄 Feature '${featureName}' rolled back to version: ${flag.rollbackVersion}`);
    }
  }

  /**
   * Rollback all enhanced export features
   */
  rollbackAll(): void {
    Object.keys(this.flags).forEach(key => {
      this.rollback(key as keyof FeatureFlags);
    });
    console.warn('🔄 All enhanced export features rolled back');
  }

  /**
   * Check system health and auto-rollback if needed
   */
  checkHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    Object.entries(this.flags).forEach(([name, flag]) => {
      if (flag.enabled && flag.errorCount && flag.errorThreshold) {
        const errorRate = (flag.errorCount / flag.errorThreshold) * 100;
        
        if (errorRate > 70) {
          issues.push(`Feature '${name}' has high error rate: ${errorRate.toFixed(1)}%`);
          recommendations.push(`Consider disabling '${name}' or investigating errors`);
        } else if (errorRate > 40) {
          issues.push(`Feature '${name}' has moderate error rate: ${errorRate.toFixed(1)}%`);
          recommendations.push(`Monitor '${name}' for stability`);
        }
      }
    });

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Export feature flags configuration for backup
   */
  exportConfig(): string {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      flags: this.flags
    }, null, 2);
  }

  /**
   * Import feature flags configuration from backup
   */
  importConfig(config: string): boolean {
    try {
      const parsed = JSON.parse(config);
      if (parsed.flags) {
        this.flags = { ...DEFAULT_FEATURE_FLAGS, ...parsed.flags };
        this.saveFlags();
        console.log('✅ Feature flags configuration imported successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to import feature flags configuration:', error);
    }
    return false;
  }
}

// Global instance
const featureFlagManager = new FeatureFlagManager();

// Utility functions for easy access
export const isEnhancedExportEnabled = () => featureFlagManager.isEnabled('enhancedExport');
export const isGroupValidationEnabled = () => featureFlagManager.isEnabled('groupValidation');
export const isDynamicColumnsEnabled = () => featureFlagManager.isEnabled('dynamicColumns');
export const isEnhancedApiUrlsEnabled = () => featureFlagManager.isEnabled('enhancedApiUrls');
export const isExportFormatEnhancementsEnabled = () => featureFlagManager.isEnabled('exportFormatEnhancements');

// Error tracking utilities
export const recordExportError = (error: string) => featureFlagManager.recordError('enhancedExport', error);
export const recordGroupValidationError = (error: string) => featureFlagManager.recordError('groupValidation', error);
export const recordDynamicColumnsError = (error: string) => featureFlagManager.recordError('dynamicColumns', error);

// Rollback utilities
export const rollbackEnhancedExport = () => featureFlagManager.rollback('enhancedExport');
export const rollbackAllFeatures = () => featureFlagManager.rollbackAll();

// Health check
export const checkSystemHealth = () => featureFlagManager.checkHealth();

// Export the manager for advanced usage
export { featureFlagManager };
export default featureFlagManager;