const base = require('@faast/ts-config/library/jest.config.js')
const { pathsToModuleNameMapper } = require('ts-jest/utils')
const { compilerOptions } = require('./tsconfig')

module.exports = Object.assign({}, base, {
  'testRunner': 'jest-circus/runner',
  'transformIgnorePatterns': [
    '/node_modules/',
    `/dist/`,
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
})
