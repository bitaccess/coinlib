const base = require('@faast/ts-config/library/jest.config.js')

module.exports = Object.assign({}, base, {
  'testRunner': 'jest-circus/runner',
  'transformIgnorePatterns': [
    '/node_modules/',
    `/dist/`,
  ],
})
