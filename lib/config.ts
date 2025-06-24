// Application configuration with environment variable validation
function validateEnvVar(name: string, value: string | undefined, required = true): string {
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

function validateOptionalEnvVar(name: string, value: string | undefined): string | null {
  if (!value) {
    console.warn(`⚠️ Optional environment variable missing: ${name} (some features may not work)`);
    return null;
  }
  return value;
}

const config = {
  supabase: {
    url: validateOptionalEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: validateOptionalEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: validateOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
  dhis2: {
    defaultUrl: process.env.NEXT_PUBLIC_DHIS2_BASE_URL || 'https://play.dhis2.org/40/api',
    username: process.env.DHIS2_USERNAME,
    password: process.env.DHIS2_PASSWORD,
  },
  cache: {
    ttlHours: Number(process.env.CACHE_TTL_HOURS) || 24,
  },
  session: {
    expiryDays: Number(process.env.SESSION_EXPIRY_DAYS) || 7,
  },
};

export default config; 