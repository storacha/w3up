/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'

import * as StorefrontService from './services/storefront.js'
import * as StorefrontEvents from './events/storefront.js'

import { getStoreImplementations } from './context/store-implementations.js'
import { Queue } from './context/queue.js'
import { getMockService, getConnection } from './context/service.js'

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
        queuedMessages.set('filecoinSubmitQueue', [])
        queuedMessages.set('pieceOfferQueue', [])
        const filecoinSubmitQueue = new Queue({
          onMessage: (message) => {
            const messages = queuedMessages.get('filecoinSubmitQueue') || []
            messages.push(message)
            queuedMessages.set('filecoinSubmitQueue', messages)
          },
        })
        const pieceOfferQueue = new Queue({
          onMessage: (message) => {
            const messages = queuedMessages.get('pieceOfferQueue') || []
            messages.push(message)
            queuedMessages.set('pieceOfferQueue', messages)
          },
        })
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
            storefrontConnection,
            storefrontInvocationConfig: {
              issuer: storefrontSigner,
              with: storefrontSigner.did(),
              audience: storefrontSigner,
            },
            aggregatorConnection,
            aggregatorInvocationConfig: {
              issuer: storefrontSigner,
              with: storefrontSigner.did(),
              audience: aggregatorSigner,
            },
            queuedMessages: new Map(),
            service,
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
          }
        )
      })
    }
  })
})
