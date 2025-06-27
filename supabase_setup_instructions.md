# Supabase Setup Instructions

## Required Tables

### 1. DHIS2 Instances Table

Make sure you have this table in your Supabase database:

```sql
-- DHIS2 Instances
CREATE TABLE IF NOT EXISTS dhis2_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- Encrypted password
  version TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sql_views_count INTEGER DEFAULT 0,
  dictionaries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Metadata Dictionaries Table

```sql
-- Metadata Dictionaries
CREATE TABLE IF NOT EXISTS metadata_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instance_id UUID NOT NULL REFERENCES dhis2_instances(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL, -- Denormalized for easier querying
  metadata_type TEXT NOT NULL CHECK (metadata_type IN ('dataElements', 'indicators', 'programIndicators', 'dataElementGroups', 'indicatorGroups')),
  sql_view_id TEXT NOT NULL,
  group_id TEXT, -- Optional group filter
  processing_method TEXT DEFAULT 'batch' CHECK (processing_method IN ('batch', 'individual')),
  period TEXT,
  version TEXT DEFAULT 'v1.0',
  variables_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'generating', 'error')),
  quality_average NUMERIC(5,2) DEFAULT 0,
  processing_time INTEGER, -- In seconds
  success_rate NUMERIC(5,2) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Dictionary Variables Table

```sql
-- Dictionary Variables (stores the actual metadata items)
CREATE TABLE IF NOT EXISTS dictionary_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dictionary_id UUID NOT NULL REFERENCES metadata_dictionaries(id) ON DELETE CASCADE,
  variable_uid TEXT NOT NULL, -- DHIS2 UID
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL, -- dataElement, indicator, etc.
  quality_score NUMERIC(5,2) DEFAULT 0,
  processing_time INTEGER, -- In milliseconds
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  metadata_json JSONB, -- Full metadata object
  analytics_url TEXT, -- Analytics API URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How to Apply These Changes

### Option 1: Using Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste each CREATE TABLE statement
4. Execute them one by one

### Option 2: Using Migration Files
1. Create migration files in your supabase/migrations folder
2. Add the SQL statements above
3. Run `supabase db push` to apply migrations

## Environment Variables

Make sure you have these environment variables in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing the Setup

After creating the tables, the application will:
- Store DHIS2 instance credentials securely
- Track metadata dictionary generation progress
- Store processing results and quality assessments
- Fall back to mock data if Supabase is not available

The app is designed to work with or without Supabase, so it will function even if the database isn't set up yet.
