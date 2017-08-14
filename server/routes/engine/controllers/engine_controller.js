'use strict'

const fs = require('fs'),
    config = require('../../../config'),
    engine = require('../lib/engine');

module.exports = (server) => {

    /**
     * Console
     */
    server.post('/engine', (req, res) => {

        // Slack
        if(req.body.token == config.chats.slack.token){
            return res.send(engine.input(req.body.text, req.body.user_id));
        }

        return res.send('Chat validation failed.')
        
    })

}