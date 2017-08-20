'use strict'

const fs = require('fs'),
    config = require('../../../config'),
    engine = require('../lib/engine'),
    format = require('../lib/format')

module.exports = (server) => {

    /**
     * Console
     */
    server.post('/engine', (req, res) => {

        // Slack
        //if(req.body.token == config.chats.slack.token){
            return res.json(format.slack(engine.run(req.body.text, req.body.user_id)))
        //}

        return res.send('Chat validation failed.')
        
    })

}