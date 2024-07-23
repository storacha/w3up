import { CBOR } from '@ucanto/core'
import * as Signer from '@ucanto/principal/ed25519'
import * as Server from '@ucanto/server'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'
import * as DealTrackerCaps from '@web3-storage/capabilities/filecoin/deal-tracker'

import * as API from '../../src/types.js'
import * as TestAPI from '../types.js'
import * as DealerEvents from '../../src/dealer/events.js'

import { FailingStore } from '../context/store.js'
import { mockService } from '../context/mocks.js'
import { getConnection } from '../context/service.js'
import { randomAggregate } from '../utils.js'
import { StoreOperationErrorName } from '../../src/errors.js'

/**
 * @typedef {import('../../src/dealer/api.js').AggregateRecord} AggregateRecord
 */

/**
 * @type {API.Tests<TestAPI.DealerTestEventsContext>}
 */
export const test = {
  'handles aggregate insert event successfully': async (assert, context) => {
    // Generate piece for test
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    const putOfferRes = await context.offerStore.put({
      key: piecesBlock.cid.toString(),
      value: {
        issuer: context.id.did(),
        aggregate: aggregate.link,
        pieces: offer,
      },
    })
    assert.ok(putOfferRes.ok)

    const offerStoreGetBeforeRename = await context.offerStore.get(
      piecesBlock.cid.toString()
    )
    assert.ok(offerStoreGetBeforeRename.ok)

    // Put aggregate record
    /** @type {AggregateRecord} */
    const aggregateRecord = {
      pieces: piecesBlock.cid,
      aggregate: aggregate.link,
      status: 'offered',
      insertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
    assert.ok(putAggregateRes.ok)

    // Handle event
    const handledPieceInsertsRes = await DealerEvents.handleAggregateInsert(
      context,
      aggregateRecord
    )
    assert.ok(handledPieceInsertsRes.ok)

    // Old name not available
    const offerStoreGetAfterRename0 = await context.offerStore.get(
      piecesBlock.cid.toString()
    )
    assert.ok(offerStoreGetAfterRename0.error)
    // New name available
    const offerStoreGetAfterRename1 = await context.offerStore.get(
      `${new Date(
        aggregateRecord.insertedAt
      ).toISOString()}_${aggregateRecord.aggregate.toString()}.json`
    )
    assert.ok(offerStoreGetAfterRename1.ok)
  },
  'handles aggregate insert errors when fails to update piece store':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const { pieces, aggregate } = await randomAggregate(100, 128)
        const offer = pieces.map((p) => p.link)
        const piecesBlock = await CBOR.write(offer)

        // Put aggregate record
        /** @type {AggregateRecord} */
        const aggregateRecord = {
          pieces: piecesBlock.cid,
          aggregate: aggregate.link,
          status: 'offered',
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledPieceInsertsRes = await DealerEvents.handleAggregateInsert(
          context,
          aggregateRecord
        )
        assert.ok(handledPieceInsertsRes.error)
        assert.equal(
          handledPieceInsertsRes.error?.name,
          StoreOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        offerStore: new FailingStore(),
      })
    ),
  'handles aggregate update status event successfully': async (
    assert,
    context
  ) => {
    // Generate piece for test
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    // Put aggregate record
    /** @type {AggregateRecord} */
    const aggregateRecord = {
      pieces: piecesBlock.cid,
      aggregate: aggregate.link,
      status: 'offered',
      insertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
    assert.ok(putAggregateRes.ok)

    // Handle event
    const handledPieceInsertsRes =
      await DealerEvents.handleAggregateUpdatedStatus(context, aggregateRecord)
    assert.ok(handledPieceInsertsRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.aggregate?.accept?.callCount, 1)
    assert.ok(
      // @ts-expect-error not typed hooks
      context.service.aggregate?.accept?._params[0].nb.pieces.equals(
        piecesBlock.cid
      )
    )
    assert.ok(
      // @ts-expect-error not typed hooks
      context.service.aggregate?.accept?._params[0].nb.aggregate.equals(
        aggregate.link
      )
    )
  },
  'handles aggregate update status event errors on dealer invocation failure':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const { pieces, aggregate } = await randomAggregate(100, 128)
        const offer = pieces.map((p) => p.link)
        const piecesBlock = await CBOR.write(offer)

        // Put aggregate record
        /** @type {AggregateRecord} */
        const aggregateRecord = {
          pieces: piecesBlock.cid,
          aggregate: aggregate.link,
          status: 'offered',
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledPieceInsertsRes =
          await DealerEvents.handleAggregateUpdatedStatus(
            context,
            aggregateRecord
          )
        assert.ok(handledPieceInsertsRes.error)
      },
      async (context) => {
        /**
         * Mock dealer to fail
         */
        const service = mockService({
          aggregate: {
            accept: Server.provideAdvanced({
              capability: DealerCaps.aggregateAccept,
              handler: async ({ invocation, context }) => {
                return {
                  error: new Server.Failure(),
                }
              },
            }),
          },
        })
        const dealerConnection = getConnection(context.id, service).connection

        return {
          ...context,
          service,
          dealerService: {
            ...context.dealerService,
            connection: dealerConnection,
          },
        }
      }
    ),
  'handles cron tick successfully by swapping state of offered aggregate':
    async (assert, context) => {
      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const piecesBlock = await CBOR.write(offer)

      // Put aggregate record
      /** @type {AggregateRecord} */
      const aggregateRecord = {
        pieces: piecesBlock.cid,
        aggregate: aggregate.link,
        status: 'offered',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
      assert.ok(putAggregateRes.ok)
      const storedDealBeforeCron = await context.aggregateStore.get({
        aggregate: aggregate.link.link(),
      })
      assert.ok(storedDealBeforeCron.ok)
      assert.equal(storedDealBeforeCron.ok?.status, 'offered')

      // Handle event
      const handledCronTick = await DealerEvents.handleCronTick(context)
      assert.ok(handledCronTick.ok)
      assert.equal(handledCronTick.ok?.updatedCount, 1)
      assert.equal(handledCronTick.ok?.pendingCount, 0)

      // Validate stores
      const storedDealAfterCron = await context.aggregateStore.get({
        aggregate: aggregate.link.link(),
      })
      assert.ok(storedDealAfterCron.ok)
      assert.equal(storedDealAfterCron.ok?.status, 'accepted')
      assert.ok(
        storedDealBeforeCron.ok?.updatedAt !== storedDealAfterCron.ok?.updatedAt
      )
    },
  'handles cron tick several times until deal exists': wichMockableContext(
    async (assert, context) => {
      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const piecesBlock = await CBOR.write(offer)

      // Put aggregate record
      /** @type {AggregateRecord} */
      const aggregateRecord = {
        pieces: piecesBlock.cid,
        aggregate: aggregate.link,
        status: 'offered',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
      assert.ok(putAggregateRes.ok)

      // Handle event
      const handledCronTick1 = await DealerEvents.handleCronTick(context)
      assert.ok(handledCronTick1.ok)
      assert.equal(handledCronTick1.ok?.updatedCount, 0)
      assert.equal(handledCronTick1.ok?.pendingCount, 1)

      // Should have same state and no deal
      const storedDealAfterFirstCron = await context.aggregateStore.get({
        aggregate: aggregate.link.link(),
      })
      assert.ok(storedDealAfterFirstCron.ok)
      assert.equal(storedDealAfterFirstCron.ok?.status, 'offered')

      // Handle event second time
      const handledCronTick2 = await DealerEvents.handleCronTick(context)
      assert.ok(handledCronTick2.ok)
      assert.equal(handledCronTick2.ok?.updatedCount, 1)
      assert.equal(handledCronTick2.ok?.pendingCount, 0)
    },
    async (context) => {
      let counter = 1

      /**
       * Mock deal tracker to only send deal info on second call
       */
      const dealTrackerSigner = await Signer.generate()
      const service = mockService({
        deal: {
          info: Server.provideAdvanced({
            capability: DealTrackerCaps.dealInfo,
            handler: async ({ invocation, context }) => {
              const invCap = invocation.capabilities[0]
              if (!invCap.nb?.piece) {
                throw new Error()
              }

              if (counter === 2) {
                /** @type {API.UcantoInterface.OkBuilder<API.DealInfoSuccess, API.DealInfoFailure>} */
                return Server.ok({
                  deals: {
                    111: {
                      provider: 'f11111',
                    },
                  },
                })
              }

              counter += 1
              return Server.ok({
                deals: {},
              })
            },
          }),
        },
      })
      const dealTrackerConnection = getConnection(
        dealTrackerSigner,
        service
      ).connection

      return {
        ...context,
        service,
        dealTrackerService: {
          connection: dealTrackerConnection,
          invocationConfig: {
            issuer: context.id,
            with: context.id.did(),
            audience: dealTrackerSigner,
          },
        },
      }
    }
  ),
  'handles cron tick errors when aggregate store query fails':
    wichMockableContext(
      async (assert, context) => {
        // Handle event
        const handledCronTick = await DealerEvents.handleCronTick(context)
        assert.ok(handledCronTick.error)
        assert.equal(handledCronTick.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        aggregateStore: new FailingStore(),
      })
    ),
  'handles cron tick errors when deal tracker fails to respond':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const { pieces, aggregate } = await randomAggregate(100, 128)
        const offer = pieces.map((p) => p.link)
        const piecesBlock = await CBOR.write(offer)

        // Put aggregate record
        /** @type {AggregateRecord} */
        const aggregateRecord = {
          pieces: piecesBlock.cid,
          aggregate: aggregate.link,
          status: 'offered',
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledCronTick = await DealerEvents.handleCronTick(context)
        assert.ok(handledCronTick.error)
      },
      async (context) => {
        /**
         * Mock deal tracker to fail
         */
        const dealTrackerSigner = await Signer.generate()
        const service = mockService({
          deal: {
            info: Server.provideAdvanced({
              capability: DealTrackerCaps.dealInfo,
              handler: async ({ invocation, context }) => {
                return {
                  error: new Server.Failure(),
                }
              },
            }),
          },
        })
        const dealTrackerConnection = getConnection(
          dealTrackerSigner,
          service
        ).connection

        return {
          ...context,
          service,
          dealTrackerService: {
            connection: dealTrackerConnection,
            invocationConfig: {
              issuer: context.id,
              with: context.id.did(),
              audience: dealTrackerSigner,
            },
          },
        }
      }
    ),
}

/**
 * @param {API.Test<TestAPI.DealerTestEventsContext>} testFn
 * @param {(context: TestAPI.DealerTestEventsContext) => Promise<TestAPI.DealerTestEventsContext>} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return async function (...args) {
    const modifiedArgs = [args[0], await mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}
