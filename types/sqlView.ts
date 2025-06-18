export interface SqlViewTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data_elements' | 'indicators' | 'categories' | 'custom';
  sqlQuery: string;
  dhisVersions: string[];
  requiredTables: string[];
  outputFields: SqlViewField[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface SqlViewField {
  name: string;
  column: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
}

export interface ConfiguredSqlView {
  templateId: string;
  uid: string;
  name: string;
  isConnected: boolean;
  lastTested: Date | null;
  testStatus: 'success' | 'error' | 'pending' | null;
  errorMessage?: string;
}

export interface ExistingSqlView {
  uid: string;
  name: string;
  description?: string;
  type: string;
  cacheStrategy: string;
  lastUpdated: string;
}

export interface SqlViewMapping {
  existingViewUid: string;
  templateId: string;
  fieldMappings: Record<string, string>; // templateField -> sqlViewColumn
} 