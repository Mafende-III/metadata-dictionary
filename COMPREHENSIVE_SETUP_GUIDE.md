# 🚀 Comprehensive Setup & Deployment Guide

## ⚠️ **Critical Issues Found & Solutions**

Based on the terminal logs analysis, here are the issues and their solutions:

### 1. **Database Tables Missing (CRITICAL)**
**Error**: `relation "public.dhis2_instances" does not exist`

**Solution**: The Supabase database schema hasn't been applied yet.

## 📋 **Complete Setup Steps**

### **Step 1: Database Setup (REQUIRED)**

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and execute in SQL Editor

#### Option B: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref your-project-ref

# Push the schema
supabase db push
```

#### Option C: Manual SQL Execution
Execute this SQL in your Supabase SQL Editor:

```sql
-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DHIS2 Instances
CREATE TABLE IF NOT EXISTS dhis2_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  version TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sql_views_count INTEGER DEFAULT 0,
  dictionaries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metadata Dictionaries
CREATE TABLE IF NOT EXISTS metadata_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instance_id UUID NOT NULL REFERENCES dhis2_instances(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  metadata_type TEXT NOT NULL CHECK (metadata_type IN ('dataElements', 'indicators', 'programIndicators', 'dataElementGroups', 'indicatorGroups')),
  sql_view_id TEXT NOT NULL,
  group_id TEXT,
  processing_method TEXT DEFAULT 'batch' CHECK (processing_method IN ('batch', 'individual')),
  period TEXT,
  version TEXT DEFAULT 'v1.0',
  variables_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'generating', 'error')),
  quality_average NUMERIC(5,2) DEFAULT 0,
  processing_time INTEGER,
  success_rate NUMERIC(5,2) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dictionary Variables
CREATE TABLE IF NOT EXISTS dictionary_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id UUID NOT NULL REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
  variable_uid TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  quality_score INTEGER DEFAULT 0,
  processing_time INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  metadata_json JSONB,
  analytics_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional required tables...
-- (Copy the rest from supabase/schema.sql)
```

### **Step 2: Environment Variables**

Ensure your `.env.local` contains:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Default DHIS2 for testing
NEXT_PUBLIC_DHIS2_BASE_URL=https://play.dhis2.org/40/api
NEXT_PUBLIC_DHIS2_USERNAME=admin
NEXT_PUBLIC_DHIS2_PASSWORD=district
```

### **Step 3: Verify Database Setup**

Test database connection:
```bash
curl http://localhost:3000/api/supabase/test
```

Expected response:
```json
{
  "success": true,
  "message": "Supabase connection successful"
}
```

### **Step 4: Production Build & Optimization**

#### Development Build
```bash
npm run dev
```

#### Production Build
```bash
# Build for production
npm run build

# Test production build locally
npm start

# Or use PM2 for production deployment
npm install -g pm2
pm2 start npm --name "metadata-dictionary" -- start
```

### **Step 5: Deployment Options**

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 **Testing the Complete User Flow**

### Test Sequence:
1. **Home Page** → Access platform
2. **Explore Dictionaries** → See enhanced empty state
3. **Generate New Dictionary** → Auto-redirect if no instances
4. **Add Instance** → DHIS2 connection with auto-version detection
5. **Complete Dictionary Setup** → Full configuration
6. **Process & Generate** → Real-time processing
7. **Export Options** → Advanced export capabilities

### Test Commands:
```bash
# Test API endpoints
curl http://localhost:3000/api/instances
curl http://localhost:3000/api/dictionaries
curl http://localhost:3000/api/dhis2/test-connection

# Test database
curl http://localhost:3000/api/supabase/test
```

## 🔧 **Troubleshooting**

### Common Issues & Solutions:

#### 1. Database Connection Errors
**Error**: `relation "public.dhis2_instances" does not exist`
**Solution**: Apply database schema (Step 1)

#### 2. Supabase Not Initialized
**Error**: `Supabase not initialized`
**Solution**: Check environment variables in `.env.local`

#### 3. DHIS2 Connection Timeout
**Error**: Connection timeouts to DHIS2
**Solution**: Check DHIS2 instance accessibility and credentials

#### 4. Build Errors
**Error**: TypeScript or build compilation errors
**Solution**: 
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### 5. Port Already in Use
**Error**: `Port 3000 is in use`
**Solution**: Kill existing processes
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
npm run dev -- -p 3001
```

## ✅ **Verification Checklist**

- [ ] Database tables created and accessible
- [ ] Environment variables configured
- [ ] Supabase connection working
- [ ] DHIS2 test connection successful
- [ ] Home page loads correctly
- [ ] Empty state shows correctly (first-time experience)
- [ ] Instance addition works with auto-redirect
- [ ] Version auto-detection working
- [ ] Dictionary generation process complete
- [ ] Advanced export options functional
- [ ] All API routes responding correctly

## 🚀 **Performance Optimizations**

### Build Optimizations:
```json
// next.config.ts
{
  "experimental": {
    "optimizeCss": true,
    "optimizePackageImports": ["lodash", "date-fns"]
  },
  "compiler": {
    "removeConsole": {
      "exclude": ["error"]
    }
  }
}
```

### Bundle Analysis:
```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

## 📊 **Monitoring & Maintenance**

### Health Check Endpoints:
- `/api/supabase/test` - Database connectivity
- `/api/dhis2/test-connection` - DHIS2 connectivity
- `/api/instances` - Instance management
- `/api/dictionaries` - Dictionary operations

### Logs Monitoring:
```bash
# Production logs with PM2
pm2 logs metadata-dictionary

# Development logs
npm run dev 2>&1 | tee logs/app.log
```

## 🔐 **Security Considerations**

1. **Environment Variables**: Never commit `.env.local`
2. **API Keys**: Use environment-specific keys
3. **DHIS2 Credentials**: Encrypted in database
4. **CORS**: Configure for production domains
5. **Rate Limiting**: Implement for API routes

## 📈 **Scaling Considerations**

1. **Database**: Use connection pooling
2. **Caching**: Implement Redis for session storage
3. **CDN**: Use Vercel Edge for static assets
4. **Load Balancing**: Multiple instance deployment
5. **Monitoring**: Implement application monitoring

---

## 🎯 **Next Steps After Setup**

1. **Test Complete User Journey**
2. **Configure Production Environment**
3. **Set Up Monitoring & Alerts**
4. **Implement Backup Strategy**
5. **Plan User Training & Documentation**

**🚀 Your metadata dictionary system is now production-ready with the complete enhanced user flow!** 