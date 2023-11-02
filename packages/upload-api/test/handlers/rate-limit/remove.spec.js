/* eslint-disable no-nested-ternary */
import * as Suite from './remove.js'
import * as assert from 'assert'
import { cleanupContext, createContext } from '../../helpers/context.js'

describe('rate-limit/remove', () => {
  for (const [name, test] of Object.entries(Suite.test)) {
    const define = name.startsWith('only! ')
      ? it.only
      : name.startsWith('skip! ')
      ? it.skip
      : it

    define(name, async () => {
      const context = await createContext()
      try {
        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          context
        )
      } finally {
        cleanupContext(context)
      }
    })
  }
})
