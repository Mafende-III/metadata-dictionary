# Environment Setup Guide

## Current Issues & Solutions

The errors you're experiencing are due to missing environment variables and database connection issues. Here's how to fix them:

### 1. Missing Supabase Configuration

The system can't connect to the database because Supabase environment variables are missing. Create a `.env.local` file in your project root with:

```bash
# Database Configuration (Supabase) - Optional for development
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Development - these will make the app work without Supabase
NODE_ENV=development
ENCRYPTION_KEY=metadata-dictionary-development-key
```

### 2. How the System Works Without Supabase

**Good News**: The system is designed to work without Supabase using mock data. When Supabase is not configured:

- **Instance Management**: Uses built-in mock instances
- **Authentication**: Uses default credentials (admin/district for DHIS2 demo)
- **Data Storage**: Uses in-memory storage

### 3. Mock Instances Available

The system includes these test instances:

1. **hmistesting** (ID: a07cbb75-d668-4976-9b32-ad006008f1c8)
   - URL: https://online.hisprwanda.org/hmis/api
   - Username: bmafende
   - Password: Climate@123

2. **Demo DHIS2** (ID: 67950ada-2fba-4e6f-aa94-a44f33aa8d20)
   - URL: https://play.dhis2.org/40/api
   - Username: admin
   - Password: district

### 4. SSL Certificate Issues

For instances with SSL certificate problems (like expired certificates), the system now:

- **Automatically detects** certificate issues
- **Bypasses SSL verification** for known internal instances
- **Provides fallback mock data** when connections fail
- **Shows helpful error messages** for certificate problems

### 5. Quick Test

To verify everything works:

1. Start the development server: `npm run dev`
2. Open http://localhost:3000 (or the port shown)
3. Try connecting to the Demo DHIS2 instance
4. If you get the hmistesting instance, try switching between instances

### 6. Troubleshooting

**If you still see "fetch failed" errors:**

1. Check if Supabase URL/keys are set (they're optional but if set, must be valid)
2. Restart the development server
3. Clear browser cache
4. Check network connectivity

**Certificate Issues:**

- The system now automatically handles self-signed certificates
- Expired certificates will fallback to mock data
- Error messages will guide you to solutions

### 7. Production Setup

For production deployment:

1. Set up a Supabase project
2. Add the environment variables
3. Run the database migrations
4. Configure your DHIS2 instances through the UI

The system is designed to be flexible - it works great for development without any database setup! 