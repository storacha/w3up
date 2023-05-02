/* eslint-disable no-nested-ternary */
/* eslint-disable no-only-tests/no-only-tests */
import * as Suite from './access-client-agent.js'
import * as assert from 'assert'
import { context } from './helpers/context.js'
import { queue } from './helpers/utils.js'

describe('access-client-agent', () => {
  for (const [name, test] of Object.entries(Suite.test)) {
    const define = name.startsWith('only! ')
      ? it.only
      : name.startsWith('skip! ')
      ? it.skip
      : it

    define(name, async () => {
      const mail = queue(/** @type {{to:string, url:string}[]} */ ([]))

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
