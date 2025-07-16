# Deployment Checklist - DHIS2 Metadata Dictionary

## Pre-Deployment Verification

### 1. Environment Variables ✓
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Update all placeholder values with actual production values
- [ ] Verify DHIS2 credentials and API endpoints
- [ ] Confirm Supabase configuration
- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXT_PUBLIC_APP_URL=https://dictionary.mafendeblaise.info`
- [ ] Set appropriate SSL/TLS certificates paths

### 2. Database Setup ✓
- [ ] Supabase project created and configured
- [ ] Database migrations executed (`supabase/migrations/`)
- [ ] Tables created successfully:
  - `dhis2_instances`
  - `dhis2_sessions`
  - `dictionaries`
  - `dictionary_variables`
  - `processing_queue`
  - `action_tracking`
- [ ] Service role key configured
- [ ] Database connection tested

### 3. Code Preparation ✓
- [ ] Latest code committed to repository
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Production build tested locally (`npm run build`)
- [ ] Bundle analysis checked (`npm run build:analyze`)
- [ ] Dependencies updated and secured

### 4. Static Assets & Performance ✓
- [ ] Images optimized and compressed
- [ ] Static files in `/public` directory
- [ ] CDN configuration (if applicable)
- [ ] Bundle size optimized (<1MB gzipped)
- [ ] Cache headers configured
- [ ] Font loading optimized

### 5. Error Handling ✓
- [ ] Custom 404 page created (`app/not-found.tsx`)
- [ ] Custom 500 page created (`app/error.tsx`)
- [ ] Global error boundary implemented
- [ ] Fallback UI components ready
- [ ] Logging configuration set up

### 6. Security Configuration ✓
- [ ] HTTPS enabled with SSL certificates
- [ ] Security headers configured in `next.config.ts`
- [ ] CORS policies set appropriately
- [ ] Rate limiting configured
- [ ] Authentication middleware tested
- [ ] No hardcoded secrets in code

### 7. Performance Optimization ✓
- [ ] React Query caching configured
- [ ] Virtualized tables for large datasets
- [ ] Code splitting implemented
- [ ] Image optimization enabled
- [ ] Bundle analyzer results reviewed
- [ ] Memory usage optimized (<200MB)

## Server Configuration

### 8. PM2 Process Manager ✓
- [ ] PM2 installed globally
- [ ] `ecosystem.config.js` configured
- [ ] Process monitoring enabled
- [ ] Auto-restart configured
- [ ] Log rotation set up

### 9. Nginx Configuration ✓
- [ ] Nginx installed and configured
- [ ] SSL certificates installed
- [ ] Reverse proxy configured
- [ ] Gzip compression enabled
- [ ] Static file serving optimized
- [ ] Rate limiting configured

### 10. Domain & DNS ✓
- [ ] Domain `dictionary.mafendeblaise.info` configured
- [ ] DNS A record pointing to `209.250.236.158`
- [ ] SSL certificate for domain obtained
- [ ] HTTPS redirect configured
- [ ] www redirect configured (if needed)

## Deployment Process

### 11. Server Preparation ✓
- [ ] Node.js >=18.0.0 installed
- [ ] npm >=8.0.0 installed
- [ ] Git repository cloned
- [ ] Environment variables set
- [ ] File permissions configured

### 12. Build & Deploy ✓
- [ ] Dependencies installed (`npm ci`)
- [ ] Production build created (`npm run build`)
- [ ] Build artifacts verified
- [ ] PM2 process started
- [ ] Nginx reloaded
- [ ] SSL certificates verified

### 13. Post-Deployment Testing ✓
- [ ] Application accessible at `https://dictionary.mafendeblaise.info`
- [ ] DHIS2 authentication working
- [ ] Database connections functional
- [ ] API endpoints responding
- [ ] Static assets loading
- [ ] Error pages displaying correctly

### 14. Monitoring & Maintenance ✓
- [ ] PM2 monitoring dashboard configured
- [ ] Log files rotation configured
- [ ] Performance monitoring enabled
- [ ] Backup procedures established
- [ ] Update procedures documented

## Emergency Contacts & Resources

### Support Information
- **Server IP**: 209.250.236.158
- **Domain**: dictionary.mafendeblaise.info
- **Repository**: Current project directory
- **Documentation**: `CLAUDE.md`, `README.md`

### Rollback Procedures
- [ ] Previous version backup available
- [ ] Database backup procedures tested
- [ ] Quick rollback commands documented
- [ ] Emergency maintenance page ready

### Performance Benchmarks
- **Target Response Time**: <2 seconds
- **Memory Usage**: <200MB
- **CPU Usage**: <80%
- **Cache Hit Rate**: >80%

## Final Verification

### Production Health Check
- [ ] All services running (`pm2 status`)
- [ ] Nginx status active (`systemctl status nginx`)
- [ ] SSL certificate valid
- [ ] Database connections healthy
- [ ] API endpoints responsive
- [ ] Error monitoring active

### User Acceptance Testing
- [ ] Login functionality tested
- [ ] Metadata browsing working
- [ ] SQL Views functionality operational
- [ ] Export features working
- [ ] Performance acceptable
- [ ] Mobile responsiveness verified

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Version**: _________________  
**Notes**: _________________

**Sign-off**: _________________