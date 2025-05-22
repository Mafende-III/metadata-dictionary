// Application configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rjsejaauzkzsoixykepp.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2VqYWF1emt6c29peHlrZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Mzg2MzMsImV4cCI6MjA2MzMxNDYzM30.Z3RhVlCosFc8EyWDzmoKa9xaSEQI-lr53trHQjbmarQ',
  },
  dhis2: {
    defaultUrl: process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api',
  },
  cache: {
    ttlHours: Number(process.env.CACHE_TTL_HOURS) || 24,
  },
  session: {
    expiryDays: Number(process.env.SESSION_EXPIRY_DAYS) || 7,
  },
};

export default config; 