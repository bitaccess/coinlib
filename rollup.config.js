const base = require('@faast/ts-config/library/rollup.config')
const pkg = require('./package.json')

export default {
  ...base(pkg),
  // overrides here
}
