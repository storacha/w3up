/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Aggregate from './aggregate.js'
import * as Signer from '@ucanto/principal/ed25519'

import { OfferStore } from './context/offer-store.js'
import { AggregateStore } from './context/aggregate-store.js'

describe('aggregate/*', () => {
  for (const [name, test] of Object.entries(Aggregate.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
      ? it.skip
      : it

    define(name, async () => {
      const signer = await Signer.generate()
      const id = signer.withDID('did:web:test.web3.storage')
      const aggregateStore = new AggregateStore()

      await test(
        {
          equal: assert.strictEqual,
          deepEqual: assert.deepStrictEqual,
          ok: assert.ok,
        },
        {
          id,
          errorReporter: {
            catch(error) {
              assert.fail(error)
            },
          },
          offerStore: new OfferStore(),
          arrangedOfferStore: new OfferStore(),
          aggregateStore,
          aggregateStoreBackend: aggregateStore,
        }
      )
    })
  }
})
