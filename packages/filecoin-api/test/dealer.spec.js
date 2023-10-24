/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'

import * as DealerService from './services/dealer.js'
import * as DealerEvents from './events/dealer.js'

import { getStoreImplementations } from './context/store-implementations.js'
import { getMockService, getConnection } from './context/service.js'
import { validateAuthorization } from './utils.js'

describe('Dealer', () => {
  describe('aggregate/*', () => {
    for (const [name, test] of Object.entries(DealerService.test)) {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const dealerSigner = await Signer.generate()

        // resources
        /** @type {Map<string, unknown[]>} */
        const queuedMessages = new Map()
        const {
          dealer: { aggregateStore, offerStore },
        } = getStoreImplementations()

        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          {
            id: dealerSigner,
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
            aggregateStore,
            offerStore,
            queuedMessages,
            validateAuthorization
          }
        )
      })
    }
  })

  describe('events', () => {
    for (const [name, test] of Object.entries(DealerEvents.test)) {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const dealerSigner = await Signer.generate()
        const dealTrackerSigner = await Signer.generate()
        const service = getMockService()
        const dealerConnection = getConnection(dealerSigner, service).connection
        const dealTrackerConnection = getConnection(
          dealTrackerSigner,
          service
        ).connection

        // resources
        /** @type {Map<String, unknown[]>} */
        const queuedMessages = new Map()
        const {
          dealer: { aggregateStore, offerStore },
        } = getStoreImplementations()

        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          {
            id: dealerSigner,
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
            aggregateStore,
            offerStore,
            queuedMessages,
            dealerService: {
              connection: dealerConnection,
              invocationConfig: {
                issuer: dealerSigner,
                with: dealerSigner.did(),
                audience: dealerSigner,
              },
            },
            dealTrackerService: {
              connection: dealTrackerConnection,
              invocationConfig: {
                issuer: dealerSigner,
                with: dealerSigner.did(),
                audience: dealTrackerSigner,
              },
            },
            service,
            validateAuthorization
          }
        )
      })
    }
  })
})
