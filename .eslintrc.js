module.exports = {
  root: true,
  plugins: [
    '@typescript-eslint',
    'jest',
  ],
  ignorePatterns: ['.eslintrc.js'],
  env: {
    'jest/globals': true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'standard',
    'prettier',
  ],
  overrides: [
    {
      parser: '@typescript-eslint/parser',
      files: ['*.{ts,tsx}'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: false,
        },
        project: ['./tsconfig.eslint.json', './packages/*/tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['packages/*/test/**/*.ts'],
      rules: {
        'camelcase': 'off',
        'no-unmodified-loop-condition': 'off',
      }
    }
  ],
  rules: {
    'no-redeclare': 'off',
    'no-dupe-class-members': 'off',
    'no-unused-vars': 'off',
  }
}
