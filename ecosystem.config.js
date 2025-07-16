module.exports = {
  apps: [
    {
      name: 'dictionary-app',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/metadict',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // PM2 Configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logging Configuration
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/dictionary-app-error.log',
      out_file: '/var/log/pm2/dictionary-app-out.log',
      log_file: '/var/log/pm2/dictionary-app-combined.log',
      
      // Advanced Configuration
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Health Monitoring
      health_check_http_url: 'http://localhost:3000/api/system/status',
      health_check_grace_period: 30000,
      
      // Environment Variables (ensure .env.production is loaded)
      env_file: '.env.production',
      
      // Process Management
      merge_logs: true,
      combine_logs: true,
      
      // Resource Monitoring
      monitor: true,
      
      // Graceful Shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Cluster Configuration
      instance_var: 'INSTANCE_ID',
      
      // Advanced Options
      node_args: '--max-old-space-size=512',
      
      // Post-deployment hooks
      post_update: ['npm install', 'npm run build'],
      
      // Time zone
      time: true,
      
      // Ignore specific files from watch
      ignore_watch: [
        'node_modules',
        '.git',
        'logs',
        '*.log',
        '.next',
        'public'
      ],
      
      // Custom environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        INSTANCE_NAME: 'dictionary-app-prod',
        LOG_LEVEL: 'info',
        CACHE_TTL: 300,
        PERFORMANCE_MONITORING: 'true',
        MEMORY_LIMIT: '512M'
      }
    }
  ],
  
  // Deployment Configuration
  deploy: {
    production: {
      user: 'deploy',
      host: '209.250.236.158',
      ref: 'origin/main',
      repo: 'git@github.com:user/metadict.git', // Update with actual repo
      path: '/var/www/metadict',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm git -y',
      'post-setup': 'pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 30',
      
      // SSH Configuration
      ssh_options: 'StrictHostKeyChecking=no',
      
      // Environment
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

// PM2 Commands Reference:
// pm2 start ecosystem.config.js --env production
// pm2 reload ecosystem.config.js --env production
// pm2 stop dictionary-app
// pm2 restart dictionary-app
// pm2 delete dictionary-app
// pm2 logs dictionary-app
// pm2 monit
// pm2 status
// pm2 describe dictionary-app
// pm2 reset dictionary-app (reset counters)
// pm2 save (save current processes)
// pm2 resurrect (restore saved processes)
// pm2 startup (generate startup script)
// pm2 unstartup (remove startup script)