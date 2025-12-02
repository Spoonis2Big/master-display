// PM2 Ecosystem Configuration for Master Display
module.exports = {
  apps: [{
    name: 'master-display',
    script: './server.js',

    // Instances
    instances: 1,
    exec_mode: 'fork',

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
      SESSION_SECRET: '31c8ac170cb85d46092912c039d1bbcc29a89f01a61c3e8c5b63d902392b3dbd'
    },

    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,

    // Advanced features
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'database', 'uploads'],
    max_memory_restart: '500M',

    // Restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Source map support
    source_map_support: true,

    // Process management
    kill_timeout: 5000,
    wait_ready: false,

    // Log rotation
    merge_logs: true,

    // Startup script
    cron_restart: '0 3 * * *' // Restart at 3 AM daily (optional)
  }]
};
