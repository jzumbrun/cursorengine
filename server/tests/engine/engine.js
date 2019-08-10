const fs = require('fs'),
	path = require('path')
    assert = require('assert'),
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
        return engine.run()
    }

    describe('empty value', () => {
        it('should list the name of all roms', () => {
            var result = run(''),
                match = result.match(/gold_mine/g)
            assert.equal(match[0], 'gold_mine')
        })
    })

    describe('load gold_mine', () => {
        it('should load the gold_mine rom', () => {
            var result = run('load gold_mine')
            var match = result.match(/Welcome to the Reed Gold Mine/g)
            assert.equal(match[0], 'Welcome to the Reed Gold Mine')
        })
    })

    describe('look', () => {
        it('should describe the Mine Entrance', () => {
            var result = run('look')
            var match = result.match(/You stand at the/g)
            assert.equal(match[0], 'You stand at the')
        })
    })

    describe('look at sign', () => {
        it('should describe the sign', () => {
            var result = run('look at sign')
            var match = result.match(/The sign reads/g)
            assert.equal(match[0], 'The sign reads')
        })
    })

    describe('take helmet', () => {
        it('should take the helmet', () => {
            var result = run('take helmet')
            var match = result.match(/helmet taken/g)
            assert.equal(match[0], 'helmet taken')
        })
    })

    describe('use helmet', () => {
        it('should use the helmet', () => {
            var result = run('use helmet')
            var match = result.match(/You click on the light/g)
            assert.equal(match[0], 'You click on the light')
        })
    })

    describe('go inside', () => {
        it('should go inside', () => {
            var result = run('go inside')
            var match = result.match(/It is dimly lit here/g)
            assert.equal(match[0], 'It is dimly lit here')
        })
    })

    describe('go deeper', () => {
        it('should go deeper', () => {
            var result = run('go deeper')
            console.log(result)
            var match = result.match(/You found more gold/g)
            assert.equal(match[0], 'You found more gold')
        })
    })

    describe('delete gold_mine', () => {
        it('should delete the saved gold_mine game', () => {
            var result = run('delete gold_mine with 321ce123')
            var match = result.match(/gold_mine/g)
            assert.equal(match[0], 'gold_mine')
        })
    })

})