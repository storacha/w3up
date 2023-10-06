/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'

import * as Storefront from './services/storefront.js'

import { Store } from './context/store.js'
import { Queue } from './context/queue.js'
import { validateAuthorization } from './helpers/utils.js'

describe('filecoin/*', () => {
  for (const [name, test] of Object.entries(Storefront.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
      ? it.skip
      : it

    define(name, async () => {
      const signer = await Signer.generate()
      const id = signer.withDID('did:web:test.web3.storage')

      // resources
      /** @type {unknown[]} */
      const queuedMessages = []
      const addQueue = new Queue({
        onMessage: (message) => queuedMessages.push(message),
      })
      const pieceLookupFn = (
        /** @type {Iterable<any> | ArrayLike<any>} */ items,
        /** @type {any} */ record
      ) => {
        return Array.from(items).find((i) => i.piece.equals(record.piece))
      }
      const pieceStore = new Store(pieceLookupFn)

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
          pieceStore,
          queuedMessages,
          validateAuthorization,
        }
      )
    })
  }
})
