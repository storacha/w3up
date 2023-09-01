/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Broker from './services/dealer.js'
import * as Signer from '@ucanto/principal/ed25519'

import { Store } from './context/store.js'
import { Queue } from './context/queue.js'

describe('deal/*', () => {
  for (const [name, test] of Object.entries(Broker.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
      ? it.skip
      : it

    define(name, async () => {
      const signer = await Signer.generate()
      const id = signer.withDID('did:web:test.spade-proxy.web3.storage')

      // resources
      /** @type {unknown[]} */
      const queuedMessages = []
      const addQueue = new Queue({
        onMessage: (message) => queuedMessages.push(message),
      })
      const offerLookupFn = (
        /** @type {Iterable<any> | ArrayLike<any>} */ items,
        /** @type {any} */ record
      ) => {
        return Array.from(items).find((i) =>
          i.aggregate.equals(record)
        )
      }
      const offerStore = new Store(offerLookupFn)

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
          addQueue,
          offerStore,
          queuedMessages,
        }
      )
    })
  }
})
