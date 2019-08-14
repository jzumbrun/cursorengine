#!/usr/bin/env node 

const Engine = require('./server/routes/engine/lib/engine')

function run(data) {
    var engine = new Engine()
    engine.setPlayer('test12345', 'Dude It')
    engine.setCommand(data)
    engine.run()
    process.stdout.write("\n")
    process.stdout.write(engine.getResponse().message)
    process.stdout.write("\n")
    process.stdout.write('> ')

}

function start() {

    run('load gold_mine')

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', function (data) {

        data = data.replace("\n", '')

        if(data === 'quit'){
            console.log("\nThanks for playing the CursorEng|ne Console\n")
            process.exit()
        }
        else {
            run(data)
        }
    })
}

start()