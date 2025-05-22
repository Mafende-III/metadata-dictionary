// API constants
export const API_ROUTES = {
  AUTH: {
    DHIS2: '/api/auth/dhis2',
  },
  DHIS2: {
    DATA_ELEMENTS: '/api/dhis2/data-elements',
    INDICATORS: '/api/dhis2/indicators',
    DASHBOARDS: '/api/dhis2/dashboards',
    SQL_VIEWS: '/api/dhis2/sql-views',
    TEST_CONNECTION: '/api/dhis2/test-connection',
  },
  METADATA: {
    QUALITY: '/api/metadata/quality',
    EXPORT: '/api/metadata/export',
  },
  SUPABASE: {
    SESSIONS: '/api/supabase/sessions',
    METADATA_CACHE: '/api/supabase/metadata-cache',
  },
};

// Navigation routes
export const ROUTES = {
  HOME: '/',
  DATA_ELEMENTS: '/data-elements',
  INDICATORS: '/indicators',
  DASHBOARDS: '/dashboards',
  SQL_VIEWS: '/sql-views',
};

// Metadata types
export const METADATA_TYPES = {
  DATA_ELEMENT: 'DATA_ELEMENT',
  INDICATOR: 'INDICATOR',
  DASHBOARD: 'DASHBOARD',
  SQL_VIEW: 'SQL_VIEW',
};

// Navigation items
export const NAV_ITEMS = [
  {
    label: 'Data Elements',
    path: ROUTES.DATA_ELEMENTS,
    description: 'Explore and assess data elements in the DHIS2 instance',
    icon: 'database',
  },
  {
    label: 'Indicators',
    path: ROUTES.INDICATORS,
    description: 'Analyze indicators and their quality',
    icon: 'chart-bar',
  },
  {
    label: 'Dashboards',
    path: ROUTES.DASHBOARDS,
    description: 'View and assess dashboards',
    icon: 'template',
  },
  {
    label: 'SQL Views',
    path: ROUTES.SQL_VIEWS,
    description: 'Examine SQL views',
    icon: 'code',
  },
];

// Quality score labels
export const QUALITY_LABELS = {
  0: 'Poor',
  1: 'Fair',
  2: 'Good',
  3: 'Very Good',
  4: 'Excellent',
};

// Quality score colors
export const QUALITY_COLORS = {
  0: 'bg-red-500',
  1: 'bg-orange-500',
  2: 'bg-yellow-500',
  3: 'bg-green-500',
  4: 'bg-blue-500',
};

// Table page sizes
export const PAGE_SIZES = [10, 25, 50, 100];

// Default cache TTL in hours
export const DEFAULT_CACHE_TTL = 24;

// Session expiry time in days
export const SESSION_EXPIRY_DAYS = 7;

// Default metadata fields
export const DEFAULT_FIELDS = {
  DATA_ELEMENT: 'id,name,displayName,code,description,created,lastUpdated,valueType,domainType,aggregationType,categoryCombo[id,name,displayName],dataElementGroups[id,name,displayName]',
  INDICATOR: 'id,name,displayName,code,description,created,lastUpdated,indicatorType[id,name,displayName],numerator,numeratorDescription,denominator,denominatorDescription,annualized,indicatorGroups[id,name,displayName]',
  DASHBOARD: 'id,name,displayName,code,description,created,lastUpdated,dashboardItems[*,visualization[id,name,displayName],chart[id,name,displayName],map[id,name,displayName]]',
  SQL_VIEW: 'id,name,displayName,code,description,created,lastUpdated,sqlQuery,type,cacheStrategy',
}; 