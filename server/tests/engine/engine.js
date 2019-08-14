const assert = require('assert'),
    Engine = require('../../routes/engine/lib/engine.js')

/**
 * Engine
 * Run this file in server dir
 */
describe('Engine', () => {
    function run(command){
        var engine = new Engine()
        engine.setPlayer('test12345', 'Dude It')
        engine.setCommand(command)
        engine.run()
        return engine.getResponse().message
    }

    describe('empty value', () => {
        it('should list the name of all roms', () => {
            var message = run('')
            match = message.match(/gold_mine/g)
            assert.equal(match[0], 'gold_mine')
        })
    })

    describe('load gold_mine', () => {
        it('should load the gold_mine rom', () => {
            var message = run('load gold_mine')
            var match = message.match(/Welcome to the Reed Gold Mine/g)
            assert.equal(match[0], 'Welcome to the Reed Gold Mine')
        })
    })

    describe('look', () => {
        it('should describe the Mine Entrance', () => {
            var message = run('look')
            var match = message.match(/You stand at the/g)
            assert.equal(match[0], 'You stand at the')
        })
    })

    describe('look at sign', () => {
        it('should describe the sign', () => {
            var message = run('look at sign')
            var match = message.match(/The sign reads/g)
            assert.equal(match[0], 'The sign reads')
        })
    })

    describe('take helmet', () => {
        it('should take the helmet', () => {
            var message = run('take helmet')
            var match = message.match(/helmet taken/g)
            assert.equal(match[0], 'helmet taken')
        })
    })

    describe('use helmet', () => {
        it('should use the helmet', () => {
            var message = run('use helmet')
            var match = message.match(/You click on the light/g)
            assert.equal(match[0], 'You click on the light')
        })
    })

    describe('go inside', () => {
        it('should go inside', () => {
            var message = run('go inside')
            var match = message.match(/It is dimly lit here/g)
            assert.equal(match[0], 'It is dimly lit here')
        })
    })

    describe('go deeper', () => {
        it('should go deeper', () => {
            var message = run('go deeper')
            var match = message.match(/You found more gold/g)
            assert.equal(match[0], 'You found more gold')
        })
    })

    describe('remove gold_mine', () => {
        it('should remove the saved gold_mine game', () => {
            var message = run('remove gold_mine with 321ce123')
            console.log(message)
            var match = message.match(/gold_mine/g)
            assert.equal(match[0], 'gold_mine')
        })
    })

})