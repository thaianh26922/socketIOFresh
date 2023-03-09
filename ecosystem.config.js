module.exports = {
  apps : [{
    name   : "meta-socketio",
    watch: true,
    script : "./server-socketio.js",
    env_production: {
       NODE_ENV: "production"
    },
    env_development: {
       NODE_ENV: "development"
    }
  }]
}