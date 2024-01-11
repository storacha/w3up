module.exports = {
  extends: ['./node_modules/hd-scripts/eslint/ts.js'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {},
  globals: {},
  rules: {
    'unicorn/prefer-number-properties': 'off',
    'unicorn/no-negated-condition': 'off',
    'unicorn/no-null': 'off',
    'unicorn/prefer-export-from': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/no-useless-undefined': 'off',
    'unicorn/expiring-todo-comments': 'off',
    'unicorn/no-nested-ternary': 'off',
    'jsdoc/require-param': 'off',
    'jsdoc/newline-after-description': 'off',
    'jsdoc/require-param-type': 'off',
    'import/extensions': 'off'
  },
  ignorePatterns: ['dist/', 'vitest.config.ts']
}
