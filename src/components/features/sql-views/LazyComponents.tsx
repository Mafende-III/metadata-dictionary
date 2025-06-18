import { lazy } from 'react';

// Lazy load heavy SQL view components
export const SqlViewDataDisplay = lazy(() => import('./SqlViewDataDisplay'));
export const SqlViewDataTable = lazy(() => import('./SqlViewDataTable'));
export const EnhancedSqlViewDisplay = lazy(() => import('./EnhancedSqlViewDisplay'));
export const SqlViewDebugger = lazy(() => import('./SqlViewDebugger'));
export const SqlViewTemplateEditor = lazy(() => import('./SqlViewTemplateEditor'));
export const SqlViewTemplateManager = lazy(() => import('./SqlViewTemplateManager'));

// Lazy load metadata components
export const MetadataTable = lazy(() => import('../metadata/MetadataTable'));

// Loading fallback component for lazy-loaded components
export const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading component...</span>
  </div>
);