const fs = require('fs'),
	path = require('path')
    assert = require('assert'),
    engine = require('../../routes/engine/lib/engine.js')

/**
 * Engine
 * Run this file in server dir
 */
describe('Engine', () => {
    function run(command){
        return engine.run(command, 'test12345', true)
    }

    describe('empty value', () => {
        it('should list the name of all roms', () => {
            var result = run('')
            var match = result.match(/gold_mine/)
            assert.equal(match[0], 'gold_mine')
        })
    })

    describe('load gold_mine', () => {
        it('should load the gold_mine rom', () => {
            var result = run('load gold_mine')
            var match = result.match(/Welcome to the Crooked Gulch Gold Mine/)
            assert.equal(match[0], 'Welcome to the Crooked Gulch Gold Mine')
        })
    })

    describe('look', () => {
        it('should describe the Mine Entrance', () => {
            var result = run('look')
            var match = result.match(/You stand at the/)
            assert.equal(match[0], 'You stand at the')
        })
    })

    describe('look at sign', () => {
        it('should describe the sign', () => {
            var result = run('look at sign')
            var match = result.match(/The sign reads/)
            assert.equal(match[0], 'The sign reads')
        })
    })

    describe('take helmet', () => {
        it('should take the helmet', () => {
            var result = run('take helmet')
            console.log(result)
            var match = result.match(/helmet taken/)
            assert.equal(match[0], 'helmet taken')
        })
    })

    after(() => {
        // Clean up
        fs.unlinkSync(`./routes/engine/lib/saves/test12345.active.json`)
	    fs.unlinkSync(`./routes/engine/lib/saves/test12345.gold_mine.json`)
    })

})