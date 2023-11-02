'use strict'

module.exports = {
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsdoc/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/ban-ts-comment": "off",
  
    "jsdoc/check-values": "off",
    "jsdoc/check-tag-names": "off",
    "jsdoc/require-returns": "off",
    "jsdoc/require-returns-type": "off",
    "jsdoc/require-throws": "off",
    "jsdoc/require-param-description": "off",
    "jsdoc/require-returns-description": "off",
    "jsdoc/valid-types": "off",
    "jsdoc/tag-lines": [
      "error",
      "any",
      {
        "startLines": 1
      }
    ],
    "jsdoc/no-undefined-types": [
      "error",
      {
        "definedTypes": [
          "ArrayLike",
          "AsyncIterable",
          "AsyncIterableIterator",
          "Iterable",
          "IterableIterator",
          "Generator",
          "CryptoKeyPair",
          "NodeJS",
          "ErrorOptions",
          "IDBTransactionMode"
        ]
      }
    ]

  }
}
