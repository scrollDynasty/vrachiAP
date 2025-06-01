module.exports = {
  apps : [{
    name: "vrachiap-backend",
    script: "main.py",
    cwd: "/home/scroll/vrachiAP/backend",
    interpreter: "/home/scroll/vrachiAP/venv/bin/python",
    env: {
      NODE_ENV: "production",
      PYTHONUNBUFFERED: "true"
    },
    watch: false,
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "500M",
    error_log: "/home/scroll/vrachiAP/logs/backend-err.log",
    out_log: "/home/scroll/vrachiAP/logs/backend-out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    autorestart: true
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