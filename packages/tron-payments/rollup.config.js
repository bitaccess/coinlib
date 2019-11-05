const base = require('../../rollup.config')
const pkg = require('./package.json')

export default {
  ...base(pkg),
  // overrides here
}
