/* eslint-disable no-nested-ternary */
/* eslint-disable no-only-tests/no-only-tests */
import * as Suite from './access-authorize.js'
import * as assert from 'assert'
import { createContext } from './helpers/context.js'

describe('access/authorize', () => {
  for (const [name, test] of Object.entries(Suite.test)) {
    const define = name.startsWith('only! ')
      ? it.only
      : name.startsWith('skip! ')
      ? it.skip
      : it

    define(name, async () => {
      await test(
        {
          equal: assert.strictEqual,
          deepEqual: assert.deepStrictEqual,
          ok: assert.ok,
        },
        await createContext()
      )
    })
  }
})
