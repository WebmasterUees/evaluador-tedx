module.exports = {
  apps: [
    {
      name: "evaluador-tedx",
      cwd: "/var/www/evaluador-tedx",
      script: "node",
      args: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3005"
      },
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "/var/log/pm2/evaluador-tedx-out.log",
      error_file: "/var/log/pm2/evaluador-tedx-error.log",
      time: true
    }
  ]
};
