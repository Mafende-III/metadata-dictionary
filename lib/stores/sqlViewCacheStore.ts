// lib/stores/sqlViewCacheStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import { SqlViewCacheEntry } from '../services/sqlViewService';

export type { SqlViewCacheEntry };

interface SqlViewCacheState {
  caches: Map<string, SqlViewCacheEntry>;
  addEntry: (entry: SqlViewCacheEntry) => void;
  removeEntry: (cacheId: string) => void;
  updateEntry: (cacheId: string, updates: Partial<SqlViewCacheEntry>) => void;
  getEntryById: (cacheId: string) => SqlViewCacheEntry | undefined;
  getEntriesForView: (sqlViewId: string) => SqlViewCacheEntry[];
  clearExpiredEntries: () => number;
  clearAllEntries: () => void;
  // Settings
  defaultCacheExpiry: number;
  setDefaultCacheExpiry: (minutes: number) => void;
  enableAutoCacheCleanup: boolean;
  setEnableAutoCacheCleanup: (enabled: boolean) => void;
}

export const useSqlViewCacheStore = create<SqlViewCacheState>()(
  persist(
    (set, get) => ({
      caches: new Map(),
      
      addEntry: (entry: SqlViewCacheEntry) => set((state) => {
        const newCaches = new Map(state.caches);
        newCaches.set(entry.id, entry);
        return { caches: newCaches };
      }),
      
      removeEntry: (cacheId: string) => set((state) => {
        const newCaches = new Map(state.caches);
        newCaches.delete(cacheId);
        return { caches: newCaches };
      }),
      
      updateEntry: (cacheId: string, updates: Partial<SqlViewCacheEntry>) => set((state) => {
        const newCaches = new Map(state.caches);
        const existing = newCaches.get(cacheId);
        if (existing) {
          newCaches.set(cacheId, { ...existing, ...updates });
        }
        return { caches: newCaches };
      }),
      
      getEntryById: (cacheId: string) => {
        return get().caches.get(cacheId);
      },
      
      getEntriesForView: (sqlViewId: string) => {
        const caches = Array.from(get().caches.values());
        return caches
          .filter(cache => cache.sqlViewId === sqlViewId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      
      clearExpiredEntries: () => {
        const now = new Date();
        const state = get();
        const newCaches = new Map(state.caches);
        let cleared = 0;
        
        newCaches.forEach((cache, id) => {
          if (cache.expiresAt && new Date(cache.expiresAt) < now) {
            newCaches.delete(id);
            cleared++;
          }
        });
        
        set({ caches: newCaches });
        return cleared;
      },
      
      clearAllEntries: () => set({ caches: new Map() }),
      
      // Settings
      defaultCacheExpiry: 60,
      setDefaultCacheExpiry: (minutes) => set({ defaultCacheExpiry: minutes }),
      enableAutoCacheCleanup: true,
      setEnableAutoCacheCleanup: (enabled) => set({ enableAutoCacheCleanup: enabled }),
    }),
    {
      name: 'sql-view-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        caches: Array.from(state.caches.entries()),
        defaultCacheExpiry: state.defaultCacheExpiry,
        enableAutoCacheCleanup: state.enableAutoCacheCleanup,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.caches)) {
          state.caches = new Map(state.caches);
        }
      },
    }
  )
);

// Auto cleanup hook
export const useAutoCleanup = () => {
  const { enableAutoCacheCleanup, clearExpiredEntries } = useSqlViewCacheStore();
  
  useEffect(() => {
    if (!enableAutoCacheCleanup) return;
    
    const interval = setInterval(() => {
      clearExpiredEntries();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [enableAutoCacheCleanup, clearExpiredEntries]);
};