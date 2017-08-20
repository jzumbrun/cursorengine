//#!/usr/bin/env node 

const Engine = require('./server/routes/engine/lib/engine'),
    command = process.argv.splice(2).join(' ')

var engine = new Engine()
engine.setPlayer('123', 'Dude It')
engine.setCommand(command)
console.log(engine.run())