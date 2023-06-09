module.exports = {
  apps : [{
    name   : "aunction-socketio",
    watch: true,
    script : "./server.ts",
    env_production: {
       NODE_ENV: "production"
    },
    env_development: {
       NODE_ENV: "development"
    }
  }]
}