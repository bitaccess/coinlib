const base = require('../../jest.config.js')

module.exports = Object.assign({}, base, {
  'testRunner': 'jest-circus/runner'
})
