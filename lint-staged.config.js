module.exports = {
  'packages/*/{src,test}/**/*.ts': [
    'prettier --write',
    'git add'
  ]
}
