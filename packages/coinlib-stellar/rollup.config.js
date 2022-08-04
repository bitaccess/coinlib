const base = require('@bitaccess/ts-config/library/rollup.config')
const pkg = require('./package.json')

module.exports = {
  ...base(pkg),
  // overrides here
}
