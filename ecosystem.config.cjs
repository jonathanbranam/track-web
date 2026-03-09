module.exports = {
  apps: [
    {
      name: 'track-web',
      script: './out/index.js',
      env_file: '.env',
      // Restart if it crashes; don't auto-restart on clean exit
      autorestart: true,
      watch: false,
      // Log files
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
