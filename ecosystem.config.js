module.exports = {
  apps: [{
    name: 'cursorengine',
    script: 'server/cursorengine.js',
    exec_mode: 'cluster',
    instances: 2,
    max_memory_restart: '100M',
    merge_logs: true
  }],
  deploy: {
    production: {
      user: 'root',
      host: ['cursorengine'],
      ref: 'origin/master',
      repo: 'git@bitbucket.org:jzumbrun/cursorengine.git',
      path: '/var/www/cursorengine',
      'post-deploy': './deploy'
    }
  }
}