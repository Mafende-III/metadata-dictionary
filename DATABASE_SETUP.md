# Database Setup Instructions

## Prerequisites
- Supabase project created
- Environment variables configured in `.env.local`

## Step 1: Apply Database Schema

The database tables are missing because the schema hasn't been applied to your Supabase database yet.

### Option A: Using Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and run the SQL script

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref your-project-ref

# Push the schema
supabase db push
```

### Option C: Manual Table Creation
If you prefer to run the schema step by step:

1. **Create Extensions**:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

2. **Create Tables**: Run each CREATE TABLE statement from `supabase/schema.sql`

3. **Create Indexes**: Run all CREATE INDEX statements

4. **Create Functions**: Run all CREATE OR REPLACE FUNCTION statements

## Step 2: Verify Setup

After applying the schema, verify that the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('dhis2_instances', 'metadata_dictionaries', 'dictionary_variables');
```

You should see:
- `dhis2_instances`
- `metadata_dictionaries`
- `dictionary_variables`
- `dhis2_sessions`
- `metadata_cache`
- `quality_assessments`
- `metadata_usage`

## Step 3: Add Your First Instance

1. Go to the **Instances** page in the application
2. Click **"Add New Instance"**
3. Fill in your DHIS2 connection details:
   - Instance Name: (e.g., "Demo DHIS2")
   - DHIS2 URL: (e.g., "https://play.im.dhis2.org/stable-2-40-8-1/")
   - Username: (your DHIS2 username)
   - Password: (your DHIS2 password)

The system will automatically:
- Test the connection
- Detect the DHIS2 version
- Store the instance with encrypted password

## Troubleshooting

### Error: "relation 'public.dhis2_instances' does not exist"
This means the database schema hasn't been applied. Follow Step 1 above.

### Error: "Failed to create instance"
- Check your DHIS2 credentials
- Ensure the DHIS2 URL is accessible
- Verify your Supabase connection

### Error: "Supabase connection failed"
- Check your `.env.local` file
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check your Supabase project is active

## Environment Variables

Make sure your `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Mock Data Fallback

If Supabase is not configured, the system will fall back to mock data. You'll see this warning:
```
⚠️ Using mock data - Supabase not configured
```

This is useful for development but you'll need a proper database for production use. 