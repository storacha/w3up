/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'

import * as StorefrontService from './services/storefront.js'
import * as StorefrontEvents from './events/storefront.js'

import { getMockService, getConnection, getStoreImplementations, getQueueImplementations } from './context/service.js'
import { validateAuthorization } from './utils.js'

describe('storefront', () => {
  describe('filecoin/*', () => {
    for (const [name, test] of Object.entries(StorefrontService.test)) {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const storefrontSigner = await Signer.generate()
        const aggregatorSigner = await Signer.generate()

        // resources
        /** @type {Map<string, unknown[]>} */
        const queuedMessages = new Map()
        const {
          storefront: { filecoinSubmitQueue, pieceOfferQueue }
        } = getQueueImplementations(queuedMessages)
        const {
          storefront: { pieceStore, receiptStore, taskStore },
        } = getStoreImplementations()

        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          {
            id: storefrontSigner,
            aggregatorId: aggregatorSigner,
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
            pieceStore,
            filecoinSubmitQueue,
            pieceOfferQueue,
            taskStore,
            receiptStore,
            queuedMessages,
            validateAuthorization
          }
        )
      })
    }
  })

  describe('events', () => {
    for (const [name, test] of Object.entries(StorefrontEvents.test)) {
      const define = name.startsWith('only ')
        ? it.only
        : name.startsWith('skip ')
        ? it.skip
        : it

      define(name, async () => {
        const storefrontSigner = await Signer.generate()
        const aggregatorSigner = await Signer.generate()

        const service = getMockService()
        const storefrontConnection = getConnection(
          storefrontSigner,
          service
        ).connection
        const aggregatorConnection = getConnection(
          aggregatorSigner,
          service
        ).connection

        // context
        const {
          storefront: { pieceStore, taskStore, receiptStore },
        } = getStoreImplementations()

        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
            ok: assert.ok,
          },
          {
            id: storefrontSigner,
            aggregatorId: aggregatorSigner,
            pieceStore,
            receiptStore,
            taskStore,
            storefrontService: {
              connection: storefrontConnection,
              invocationConfig: {
                issuer: storefrontSigner,
                with: storefrontSigner.did(),
                audience: storefrontSigner,
              },
            },
            aggregatorService: {
              connection: aggregatorConnection,
              invocationConfig: {
                issuer: storefrontSigner,
                with: storefrontSigner.did(),
                audience: aggregatorSigner,
              },
            },
            queuedMessages: new Map(),
            service,
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
