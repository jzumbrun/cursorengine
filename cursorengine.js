//#!/usr/bin/env node 

const Engine = require('./server/routes/engine/lib/engine'),
    command = process.argv.splice(2).join(' ')

var engine = new Engine()
engine.setPlayer('test12345', 'Dude It')
engine.setCommand(command)
engine.run()
console.log(engine.getResponse().message)