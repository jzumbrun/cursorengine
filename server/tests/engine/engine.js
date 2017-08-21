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
            var match = result.match(/Welcome to the Crooked Gulch Gold Mine/g)
            assert.equal(match[0], 'Welcome to the Crooked Gulch Gold Mine')
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
            console.log(result)
            var match = result.match(/helmet taken/g)
            assert.equal(match[0], 'helmet taken')
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