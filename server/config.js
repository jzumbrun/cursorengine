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
            token: 'A1EbXraxCjHNVe044htL9iXC'
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
    }
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