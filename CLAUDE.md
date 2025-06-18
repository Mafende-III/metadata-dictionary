# Claude Code Knowledge Base & Implementation Plan

## Project Overview
DHIS2 Metadata Dictionary - A comprehensive web application for exploring, assessing, and documenting DHIS2 metadata quality with advanced SQL view functionality.

## Current Status: Phase 4 - Performance Optimization (90% Complete)

### ✅ Completed Phases
1. **Phase 1: Critical Security & Structure Fixes** ✅
   - Removed hardcoded credentials from `lib/config.ts`
   - Created authentication middleware (`lib/middleware/auth.ts`)
   - Consolidated duplicate app directories
   - Fixed import resolution issues

2. **Phase 2: Service Layer Refactoring** ✅
   - Decomposed monolithic SqlViewService (549 lines → focused services)
   - Created SqlViewCacheService, SqlViewApiService, SqlViewTransformService
   - Implemented composition pattern for service orchestration

3. **Phase 3: Component Reorganization** ✅
   - Moved components to feature-based structure (`src/components/features/`)
   - Created barrel exports with index.ts files
   - Fixed all import paths and export mismatches

4. **Phase 4: Performance Optimization** 🚧 90% Complete
   - ✅ React Query integration (`hooks/useOptimizedMetadata.ts`)
   - ✅ Virtualized tables (`src/components/optimized/OptimizedMetadataTable.tsx`)
   - ✅ Memory-optimized caching (`lib/services/optimizedCacheService.ts`)
   - ✅ Bundle analysis configuration (`next.config.ts`)
   - ✅ Code splitting with lazy loading
   - ✅ Fixed SQL Views API compilation error (extractVariables method)

### 🚧 Current Tasks
- [ ] Address remaining TypeScript type errors in hooks and services
- [ ] Clean up ESLint warnings (unused variables, explicit any types)
- [ ] Complete performance optimization testing

### 📋 Next Phases
- **Phase 5**: Testing Infrastructure
- **Phase 6**: Production Deployment Preparation

## Key Technical Decisions

### Architecture
- **Framework**: Next.js 15.3.2 with App Router
- **State Management**: Zustand for client state, React Query for server state
- **Styling**: Tailwind CSS
- **Database**: Supabase for sessions/caching, DHIS2 API for metadata
- **Performance**: @tanstack/react-virtual for large datasets

### Performance Optimizations
- **Caching Strategy**: LRU cache with memory limits (200MB default)
- **Data Fetching**: React Query with 5min stale time, 15min garbage collection
- **Virtualization**: Tables virtualized for >100 rows
- **Bundle**: Tree-shaking, code splitting, optimized imports

### Security Measures
- Environment variable validation
- Authentication middleware
- No hardcoded credentials
- CSRF protection headers

## Commands & Scripts

### Development
```bash
npm run dev                  # Start development server (Turbopack)
npm run build               # Production build
npm run build:analyze       # Build with bundle analyzer
npm run type-check          # TypeScript type checking
npm run lint                # ESLint linting
npm run test:build          # Full build pipeline test
```

### Testing
```bash
# Test key functionality:
# 1. Authentication: http://localhost:3001/auth
# 2. SQL Views: http://localhost:3001/sql-views
# 3. Data Elements: http://localhost:3001/data-elements
# 4. Metadata Quality: http://localhost:3001/(auth)/data-elements
```

## File Structure & Key Components

### Core Services
- `lib/services/sqlViewService.ts` - Main orchestrating service
- `lib/services/sqlViewCacheService.ts` - Caching logic
- `lib/services/sqlViewApiService.ts` - DHIS2 API integration
- `lib/services/optimizedCacheService.ts` - Memory-optimized caching

### Performance Components
- `src/components/optimized/OptimizedMetadataTable.tsx` - Virtualized table
- `hooks/useOptimizedMetadata.ts` - React Query hooks
- `src/components/features/sql-views/LazyComponents.tsx` - Code splitting

### Authentication
- `lib/middleware/auth.ts` - Centralized auth middleware
- `lib/services/sessionService.ts` - Session management
- `components/auth/CredentialSetup.tsx` - Login UI

## Known Issues & Solutions

### Fixed Issues
1. **SQL Views API Compilation Error** ✅
   - Issue: `extractVariables` method missing
   - Solution: Implemented in SqlViewService with regex patterns for ${var}, :var, {{var}}

2. **Import Resolution Failures** ✅
   - Issue: Component moves broke imports
   - Solution: Updated all imports to use @/components/* pattern

3. **Export/Import Mismatches** ✅
   - Issue: Index files had wrong export types
   - Solution: Matched export patterns to actual component exports

### Remaining Issues
1. **TypeScript Type Errors**
   - `hooks/useFilters.ts` - undefined checks needed
   - `lib/services/sessionService.ts` - cookie API fixes needed
   - Priority: Medium

2. **ESLint Warnings**
   - Unused variables in multiple files
   - Explicit `any` types throughout codebase
   - Priority: Low

## Environment Variables Required
```env
# DHIS2 Configuration
NEXT_PUBLIC_DHIS2_BASE_URL=https://your-dhis2-instance.org/api
DHIS2_USERNAME=your-username
DHIS2_PASSWORD=your-password

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
ANALYZE=true  # For bundle analysis
NODE_ENV=production  # For production builds
```

## Performance Benchmarks
- **Development Server Start**: ~638ms (with Turbopack)
- **Build Time**: ~1000ms (optimized)
- **Cache Hit Rate**: Target >80%
- **Memory Usage**: <200MB cache limit
- **Bundle Size**: Optimized with tree-shaking

## Implementation Patterns

### Service Pattern
```typescript
// Composition over inheritance
class SqlViewService {
  private cacheService: SqlViewCacheService;
  private apiService: SqlViewApiService;
  
  constructor() {
    this.cacheService = new SqlViewCacheService();
    this.apiService = new SqlViewApiService();
  }
}
```

### React Query Pattern
```typescript
export const useDataElements = (filters: MetadataFilter) => {
  return useQuery({
    queryKey: metadataKeys.dataElementsList(filters),
    queryFn: () => fetchDataElements(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });
};
```

### Virtualization Pattern
```typescript
const virtualizer = useVirtualizer({
  count: data.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
  overscan: 10,
});
```

## Maintenance Notes
- Run `npm run type-check` before commits
- Use `npm run build:analyze` to monitor bundle size
- Monitor cache performance in production
- Update dependencies monthly
- Review security headers quarterly

## Contact & Support
- **Primary Implementation**: Claude Code Assistant
- **Session Continuity**: Use this CLAUDE.md for context restoration
- **Issue Tracking**: See TODO.md for task management

---
*Last Updated: $(date)*
*Status: Active Development - Phase 4 Performance Optimization*