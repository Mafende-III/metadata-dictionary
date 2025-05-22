import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConfiguredSqlView, SqlViewMapping } from '../types/sqlView';

interface SqlViewStore {
  configuredViews: Record<string, ConfiguredSqlView>;
  mappedViews: Record<string, SqlViewMapping>;
  dhisVersion: string;
  
  // Configuration methods
  setConfiguredView: (templateId: string, uid: string, name: string) => void;
  removeConfiguredView: (templateId: string) => void;
  updateViewStatus: (templateId: string, status: 'success' | 'error', errorMessage?: string) => void;
  
  // Mapping methods
  setViewMapping: (templateId: string, mapping: SqlViewMapping) => void;
  removeViewMapping: (templateId: string) => void;
  
  // Utility methods
  getViewUid: (templateId: string) => string | undefined;
  getConfiguredView: (templateId: string) => ConfiguredSqlView | undefined;
  getViewMapping: (templateId: string) => SqlViewMapping | undefined;
  isViewConfigured: (templateId: string) => boolean;
  setDhisVersion: (version: string) => void;
}

export const useSqlViewStore = create<SqlViewStore>()(
  persist(
    (set, get) => ({
      configuredViews: {},
      mappedViews: {},
      dhisVersion: '2.40',
      
      setConfiguredView: (templateId, uid, name) => {
        set((state) => ({
          configuredViews: {
            ...state.configuredViews,
            [templateId]: {
              templateId,
              uid,
              name,
              isConnected: false,
              lastTested: null,
              testStatus: null
            }
          }
        }));
      },
      
      removeConfiguredView: (templateId) => {
        set((state) => {
          const { [templateId]: removed, ...rest } = state.configuredViews;
          return { configuredViews: rest };
        });
      },
      
      updateViewStatus: (templateId, status, errorMessage) => {
        set((state) => ({
          configuredViews: {
            ...state.configuredViews,
            [templateId]: {
              ...state.configuredViews[templateId],
              isConnected: status === 'success',
              lastTested: new Date(),
              testStatus: status,
              errorMessage
            }
          }
        }));
      },
      
      setViewMapping: (templateId, mapping) => {
        set((state) => ({
          mappedViews: {
            ...state.mappedViews,
            [templateId]: mapping
          }
        }));
      },
      
      removeViewMapping: (templateId) => {
        set((state) => {
          const { [templateId]: removed, ...rest } = state.mappedViews;
          return { mappedViews: rest };
        });
      },
      
      getViewUid: (templateId) => {
        const configured = get().configuredViews[templateId];
        if (configured) return configured.uid;
        
        const mapped = get().mappedViews[templateId];
        return mapped?.existingViewUid;
      },
      
      getConfiguredView: (templateId) => get().configuredViews[templateId],
      getViewMapping: (templateId) => get().mappedViews[templateId],
      isViewConfigured: (templateId) => Boolean(get().getViewUid(templateId)),
      setDhisVersion: (version) => set({ dhisVersion: version })
    }),
    {
      name: 'sql-view-config',
    }
  )
); 