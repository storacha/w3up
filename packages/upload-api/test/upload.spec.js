/* eslint-disable no-only-tests/no-only-tests */
import * as Upload from './upload.js'
import * as assert from 'assert'
import { cleanupContext, createContext } from './helpers/context.js'


describe('upload/*', () => {
  for (const [name, test] of Object.entries(Upload.test)) {
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
