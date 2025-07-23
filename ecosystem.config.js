module.exports = {
  apps: [{
    name: 'healzy-backend',
    cwd: '/var/www/healzy.app/backend',
    script: 'python',
    args: '-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload',
    interpreter: '/var/www/healzy.app/backend/.venv/bin/python',
    env: {
      NODE_ENV: 'production',
      PYTHONPATH: '/var/www/healzy.app/backend',
      DATABASE_URL: 'mysql+pymysql://vrachi_user:врache2024@localhost:3306/online_doctors_db',
      SECRET_KEY: 'soglom_uz_secret_key_2024_production_healzy',
      VERIFICATION_BASE_URL: 'https://healzy.uz/verify-email'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/healzy-backend-error.log',
    out_file: '/var/log/pm2/healzy-backend-out.log',
    log_file: '/var/log/pm2/healzy-backend.log',
    time: true,
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }],

  deploy : {
    production : {
      user : "scroll",
      host : "20.119.99.213",
      ref  : "origin/master",
      repo : "https://github.com/scrollDynasty/vrachiAP.git",
      path : "/home/scroll",
      "post-deploy" : "cd vrachiAP && source venv/bin/activate && pip install -r backend/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production",
      env  : {
        NODE_ENV: "production"
      }
    }
  }
}; 