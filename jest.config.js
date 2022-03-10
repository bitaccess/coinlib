const base = require('@faast/ts-config/library/jest.config.js')

module.exports = Object.assign({}, base, {
  'testRunner': 'jest-circus/runner',
  'moduleFileExtensions': [
    'js',
    'json',
    'ts'
  ],
  'transformIgnorePatterns': [
    '/node_modules/',
    '/dist/',
  ],
  'moduleNameMapper': {
    '^#/(.*)': '<rootDir>/src/$1',
    '^@bitaccess/coinlib-([a-z-]+)(\.ts)?$': '<rootDir>/../coinlib-$1/src',
    '^@bitaccess/coinlib-([a-z-]+)/test/utils': '<rootDir>/../coinlib-$1/test/utils',
  },
})
