const fs = require('fs'),
    config = require('../../../config'),
    Engine = require('../lib/engine'),
    format = require('../lib/format')

module.exports = (server) => {

    /**
     * Console
     */
    server.post('/engine', (req, res) => {

        var engine = new Engine()
        engine.setPlayer(req.body.user_id, req.body.user_name)
        engine.setCommand(req.body.text)
        engine.run()

        // Slack
        if(req.body.token == config.chats.slack.token){

            return res.json(format.slack(engine.getResponse()))
        }

        return res.send('Chat validation failed.')
        
    })

}