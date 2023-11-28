'use strict'

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:jsdoc/recommended',
  ],
  parserOptions: {
    EXPERIMENTAL_useProjectService: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',

    /**
     * many of these rules are inherited from hd-scripts.
     * It may be useful over time to remove these rules
     * and juse use plugin:jsdoc/recommended defaults.
     * But that might require updating src.
     */
    'jsdoc/check-values': 'off',
    'jsdoc/check-tag-names': 'off',
    'jsdoc/require-jsdoc': [
      'warn',
      {
        publicOnly: true,
      },
    ],
    'jsdoc/require-returns': 'off',
    'jsdoc/require-returns-type': 'off',
    'jsdoc/require-throws': 'off',
    'jsdoc/require-yields': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-property-description': 'off',
    'jsdoc/require-returns-description': 'off',
    'jsdoc/valid-types': 'off',
    'jsdoc/tag-lines': [
      'error',
      'any',
      {
        startLines: 1,
      },
    ],
    'jsdoc/no-undefined-types': [
      'error',
      {
        definedTypes: [
          'ArrayLike',
          'AsyncIterable',
          'AsyncIterableIterator',
          'Iterable',
          'IterableIterator',
          'Generator',
          'CryptoKeyPair',
          'NodeJS',
          'ErrorOptions',
          'IDBTransactionMode',
        ],
      },
    ],
  },
}
