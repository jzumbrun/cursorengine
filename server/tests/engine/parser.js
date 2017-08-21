const fs = require('fs'),
	path = require('path')
    assert = require('assert'),
    parser = require('../../routes/engine/lib/parser.js')

/**
 * Parser
 */
describe('Parser', () => {

    describe('empty value', () => {
        it('should have empty values', () => {
            var result = parser.parse('')
            assert.equal(result.action, '')
            assert.equal(result.subject, undefined)
            assert.equal(result.object, undefined)
        })
    })

    describe('action only', () => {
        it('should have action values', () => {
            var result = parser.parse('look')
            assert.equal(result.action, 'look')
            assert.equal(result.subject, undefined)
            assert.equal(result.object, undefined)
        })
    })

    describe('action and subject', () => {
        it('should have action and subject values', () => {
            var result = parser.parse('look at helmet')
            console.log(result)
            assert.equal(result.action, 'look')
            assert.equal(result.subject, 'helmet')
            assert.equal(result.object, undefined)
        })
    })

    describe('action, subject and object', () => {
        it('should have action, subject and object values', () => {
            var result = parser.parse('look at helmet with glasses')
            console.log(result)
            assert.equal(result.action, 'look')
            assert.equal(result.subject, 'helmet')
            assert.equal(result.object, 'glasses')
        })
    })

})