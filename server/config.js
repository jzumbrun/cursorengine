const config = {}

/** DEFAULTS **/
config.defaults = {

    port: 7777,

    logger: {
        fatal: {
            to: '...',
            from: '...'
        }
    },

    chats: {
        slack: {
            token: 'SGAj2Ne94YulwFAKc5UVIdqm'
        }
    },

    sparkpost: {
        smtp: {
            service:'Sparkpost',
            auth: {
                user: 'SMTP_Injection',
                pass: '...'
            }
        },
        from: 'CursorEngine <postmaster@cursorengine.com>',
        subject: 'CursorEngine'
    },

    graphical: true,
    log: false
}

/** DEVELOPMENT **/
config.development = {

}

/** TESTING **/
config.testing = {

}

/** STAGING **/
config.staging = {

}

/** PRODUCTION **/
config.production = {
    port: 80
}

/* !!! DONT CHANGE THIS LINE !!! */
module.exports = (new function(){config.defaults.base=process.cwd()+'/';config.defaults.env=require(config.defaults.base+'.env');return require('lodash').merge(config.defaults,config[config.defaults.env])}())