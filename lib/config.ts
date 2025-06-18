// Application configuration with environment variable validation
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  supabase: {
    url: validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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