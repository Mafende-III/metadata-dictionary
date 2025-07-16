# Prepare Dictionary App for Vultr Deployment

Prepare dictionary app for Vultr deployment at 209.250.236.158:

1. Verify package.json has:
   - "build": "next build"
   - "start": "next start"
   - Node engine: ">=18.0.0"

2. Create .env.production.example with all required variables

3. Update next.config.js for production:
   - Set output: 'standalone'
   - Configure allowed domains for images

4. Create deployment checklist:
   - All environment variables documented
   - Database migrations ready
   - Static assets optimized
   - Error pages (404, 500) created

5. Generate PM2 ecosystem file for production

6. Create nginx config template for dictionary.mafendeblaise.info

Output all created files and confirmation.