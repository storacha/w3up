/* eslint-disable no-only-tests/no-only-tests */
import * as Delegate from './access-delegate.js'
import * as assert from 'assert'
import { context } from './helpers/context.js'

describe('access/delegate', () => {
  for (const [name, test] of Object.entries(Delegate.test)) {
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
        await context()
      )
    })
  }
})
