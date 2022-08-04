const base = require('@bitaccess/ts-config/library/rollup.config')
const pkg = require('./package.json')

const baseConfig = base(pkg)
module.exports = {
  ...baseConfig,
  external: [
    ...baseConfig.external,
    'bip174/src/lib/interfaces',
  ]
  // overrides here
}
