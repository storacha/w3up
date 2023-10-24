/* eslint-disable no-only-tests/no-only-tests */
import * as UCAN from './ucan.js'
import * as assert from 'assert'
import { cleanupContext, createContext } from '../helpers/context.js'

describe('ucan/*', () => {
  for (const [name, test] of Object.entries(UCAN.test)) {
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
