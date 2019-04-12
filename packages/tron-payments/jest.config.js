module.exports = {
  collectCoverage: true,
  verbose: true,
  'transform': {
    '.(ts|tsx)': 'ts-jest'
  },
  'testEnvironment': 'node',
  'testRegex': '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  'testPathIgnorePatterns': [
    '/dist/'
  ],
  'moduleFileExtensions': [
    'ts',
    'tsx',
    'js'
  ],
  'moduleNameMapper': {
    '#/(.*)': '<rootDir>/src/$1'
  },
  'coveragePathIgnorePatterns': [
    '/node_modules/',
    '/test/'
  ],
  'coverageThreshold': {
    'global': {
      'branches': 5,
      'functions': 5,
      'lines': 5,
      'statements': 5
    }
  },
  'collectCoverageFrom': [
    'src/*.{js,ts}'
  ]
}
