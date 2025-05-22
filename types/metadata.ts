// DHIS2 Metadata base type
export interface BaseMetadata {
  id: string;
  name: string;
  displayName: string;
  code?: string;
  description?: string;
  created: string;
  lastUpdated: string;
}

// Data Element specific type
export interface DataElement extends BaseMetadata {
  valueType: string;
  domainType: string;
  aggregationType: string;
  categoryCombo?: { id: string; name: string; displayName: string };
  dataElementGroups?: Array<{ id: string; name: string; displayName: string }>;
}

// Indicator specific type
export interface Indicator extends BaseMetadata {
  indicatorType: { id: string; name: string; displayName: string };
  numerator: string;
  numeratorDescription?: string;
  denominator: string;
  denominatorDescription?: string;
  annualized: boolean;
  indicatorGroups?: Array<{ id: string; name: string; displayName: string }>;
}

// Dashboard specific type
export interface Dashboard extends BaseMetadata {
  dashboardItems?: Array<{
    id: string;
    type: string;
    visualization?: { id: string; name: string; displayName: string };
    chart?: { id: string; name: string; displayName: string };
    map?: { id: string; name: string; displayName: string };
    text?: string;
  }>;
  access: {
    read: boolean;
    update: boolean;
    externalize: boolean;
    delete: boolean;
    write: boolean;
    manage: boolean;
  };
}

// SQL View specific type
export interface SQLView extends BaseMetadata {
  sqlQuery: string;
  type: 'VIEW' | 'MATERIALIZED_VIEW' | 'QUERY';
  cacheStrategy: 'NO_CACHE' | 'RESPECT_SYSTEM_SETTING' | 'CACHE_1_HOUR' | 'CACHE_6AM_TOMORROW' | 'CACHE_TWO_WEEKS';
}

// Quality assessment type
export interface QualityAssessment {
  id: string;
  metadataId: string;
  metadataType: 'DATA_ELEMENT' | 'INDICATOR' | 'DASHBOARD' | 'SQL_VIEW';
  hasDescription: boolean;
  hasCode: boolean;
  hasActivityStatus: boolean;
  recentlyUpdated: boolean;
  qualityScore: number; // 0-4
  assessedAt: string;
}

// Metadata filter type
export interface MetadataFilter {
  search?: string;
  type?: string[];
  group?: string[];
  qualityScore?: number[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Metadata with quality
export interface MetadataWithQuality<T extends BaseMetadata> {
  metadata: T;
  quality: QualityAssessment;
} 