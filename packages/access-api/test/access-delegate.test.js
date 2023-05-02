/* eslint-disable no-nested-ternary */
/* eslint-disable no-only-tests/no-only-tests */
import * as Delegate from './access-delegate.js'
import * as assert from 'assert'
import { context } from './helpers/context.js'
import { queue } from './helpers/utils.js'

describe('access/delegate', () => {
  for (const [name, test] of Object.entries(Delegate.test)) {
    const define = name.startsWith('only! ')
      ? it.only
      : name.startsWith('skip! ')
      ? it.skip
      : it

    const mail = queue(/** @type {{to:string, url:string}[]} */ ([]))
    define(name, async () => {
      await test(
        {
          equal: assert.strictEqual,
          deepEqual: assert.deepStrictEqual,
          ok: assert.ok,
        },
        {
          mail,
          ...(await context({
            globals: {
              email: {
                /**
                 * @param {*} email
                 */
                sendValidation(email) {
                  mail.put(email)
                },
              },
            },
          })),
        }
      )
    })
  }
})
