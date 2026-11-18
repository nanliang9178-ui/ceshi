/**
 * PM2 进程配置（推荐的单机部署方式）
 *
 * 使用：
 *   npm run build
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'tianshu-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      // SQLite 单文件数据库只能单实例写入；切换 MySQL 后可改为 cluster 多实例
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '../../logs/api-error.log',
      out_file: '../../logs/api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
