import * as RateLimitsStorage from './rate-limits-storage-tests.js'
import * as assert from 'assert'
import { cleanupContext, createContext } from './helpers/context.js'

describe('in memory rate limits storage', async () => {
  for (const [name, test] of Object.entries(RateLimitsStorage.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
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
        await cleanupContext(context)
      }
    })
  }
})
