import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'

import * as DealTrackerService from './services/deal-tracker.js'

import { getStoreImplementations } from './context/store-implementations.js'
import { validateAuthorization } from './utils.js'

/**
 * @typedef {import('../src/deal-tracker/api.js').DealRecord} DealRecord
 * @typedef {import('../src/deal-tracker/api.js').DealRecordKey} DealRecordKey
 */

describe('deal-tracker', () => {
  describe('deal/*', () => {
    for (const [name, test] of Object.entries(DealTrackerService.test)) {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const dealTrackerSigner = await Signer.generate()

        // resources
        const {
          dealTracker: { dealStore },
        } = getStoreImplementations()

        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          {
            id: dealTrackerSigner,
            dealStore,
            queuedMessages: new Map(),
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
            validateAuthorization
          }
        )
      })
    }
  })
})
