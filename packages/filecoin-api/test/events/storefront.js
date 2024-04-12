import * as Server from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { CBOR } from '@ucanto/core'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'

import * as API from '../../src/types.js'
import * as TestAPI from '../types.js'
import * as StorefrontEvents from '../../src/storefront/events.js'
import {
  StoreOperationErrorName,
  UnexpectedStateErrorName,
  BlobNotFoundErrorName,
} from '../../src/errors.js'

import { randomCargo, randomAggregate } from '../utils.js'
import { FailingStore } from '../context/store.js'
import { mockService } from '../context/mocks.js'
import { getConnection } from '../context/service.js'
import { getStoreImplementations } from '../context/store-implementations.js'
import { createInvocationsAndReceiptsForDealDataProofChain } from '../context/receipts.js'

/**
 * @typedef {import('../../src/storefront/api.js').PieceRecord} PieceRecord
 */

/**
 * @type {API.Tests<TestAPI.StorefrontTestEventsContext>}
 */
export const test = {
  'handles filecoin submit messages successfully': async (assert, context) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }

    // Store bytes on datastore
    await context.dataStore.put(cargo.bytes)

    // Handle message
    const handledMessageRes =
      await StorefrontEvents.handleFilecoinSubmitMessage(context, message)
    assert.ok(handledMessageRes.ok)

    // Verify store
    const hasStoredPiece = await context.pieceStore.get({
      piece: cargo.link.link(),
    })
    assert.ok(hasStoredPiece.ok)
    assert.equal(hasStoredPiece.ok?.status, 'submitted')
  },
  'handles filecoin submit messages with error if blob of content is not stored':
    async (assert, context) => {
      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // Store piece into store
      const message = {
        piece: cargo.link.link(),
        content: cargo.content.link(),
        group: context.id.did(),
      }

      // Handle message
      const handledMessageRes =
        await StorefrontEvents.handleFilecoinSubmitMessage(context, message)
      assert.ok(handledMessageRes.error)
      assert.equal(handledMessageRes.error?.name, BlobNotFoundErrorName)
    },
  'handles filecoin submit messages deduping when stored': async (
    assert,
    context
  ) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }
    /** @type {PieceRecord} */
    const pieceRecord = {
      ...message,
      status: 'submitted',
      insertedAt: new Date(Date.now() - 10).toISOString(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    }
    const putRes = await context.pieceStore.put(pieceRecord)
    assert.ok(putRes.ok)

    // Handle message
    const handledMessageRes =
      await StorefrontEvents.handleFilecoinSubmitMessage(context, message)
    assert.ok(handledMessageRes.ok)

    // Verify store
    const hasStoredPiece = await context.pieceStore.get({
      piece: cargo.link.link(),
    })
    assert.ok(hasStoredPiece.ok)
    assert.equal(hasStoredPiece.ok?.status, 'submitted')
    assert.equal(hasStoredPiece.ok?.updatedAt, pieceRecord.updatedAt)
  },
  'handles filecoin submit messages errors when fails to access piece store':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)

        // Store piece into store
        const message = {
          piece: cargo.link.link(),
          content: cargo.content.link(),
          group: context.id.did(),
        }

        // Handle message
        const handledMessageRes =
          await StorefrontEvents.handleFilecoinSubmitMessage(context, message)
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceStore: getStoreImplementations(FailingStore).storefront.pieceStore,
      })
    ),
  'handles piece offer messages successfully': async (assert, context) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }

    // Handle message
    const handledMessageRes = await StorefrontEvents.handlePieceOfferMessage(
      context,
      message
    )
    assert.ok(handledMessageRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.piece?.offer?.callCount, 1)
    assert.equal(
      // @ts-expect-error not typed hooks
      context.service.piece?.offer?._params[0].nb.group,
      message.group
    )
    assert.ok(
      // @ts-expect-error not typed hooks
      message.piece.equals(context.service.piece?.offer?._params[0].nb.piece)
    )
  },
  'handles piece offer messages erroring when fails to invoke piece offer':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)

        // Store piece into store
        const message = {
          piece: cargo.link.link(),
          content: cargo.content.link(),
          group: context.id.did(),
        }

        // Handle message
        const handledMessageRes =
          await StorefrontEvents.handlePieceOfferMessage(context, message)
        assert.ok(handledMessageRes.error)
      },
      async (context) => {
        /**
         * Mock aggregator to fail
         */
        const aggregatorSigner = await Signer.generate()
        const service = mockService({
          piece: {
            offer: Server.provideAdvanced({
              capability: AggregatorCaps.pieceOffer,
              handler: async ({ invocation, context }) => {
                return {
                  error: new Server.Failure(),
                }
              },
            }),
          },
        })
        const aggregatorConnection = getConnection(
          aggregatorSigner,
          service
        ).connection
        return {
          ...context,
          service,
          aggregatorService: {
            connection: aggregatorConnection,
            invocationConfig: {
              issuer: context.id,
              with: context.id.did(),
              audience: aggregatorSigner,
            },
          },
        }
      }
    ),
  'handles piece insert event successfully': async (assert, context) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }
    /** @type {PieceRecord} */
    const pieceRecord = {
      ...message,
      status: 'submitted',
      insertedAt: new Date(Date.now() - 10).toISOString(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    }

    // Handle message
    const handledMessageRes = await StorefrontEvents.handlePieceInsert(
      context,
      pieceRecord
    )
    assert.ok(handledMessageRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.filecoin?.submit?.callCount, 1)
    assert.ok(
      message.content.equals(
        // @ts-expect-error not typed hooks
        context.service.filecoin?.submit?._params[0].nb.content
      )
    )
    assert.ok(
      message.piece.equals(
        // @ts-expect-error not typed hooks
        context.service.filecoin?.submit?._params[0].nb.piece
      )
    )
  },
  'handles piece insert event to issue equivalency claims successfully': async (
    assert,
    context
  ) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }
    /** @type {PieceRecord} */
    const pieceRecord = {
      ...message,
      status: 'submitted',
      insertedAt: new Date(Date.now() - 10).toISOString(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    }

    // Handle message
    const handledMessageRes =
      await StorefrontEvents.handlePieceInsertToEquivalencyClaim(
        context,
        pieceRecord
      )
    assert.ok(handledMessageRes.ok)
    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.assert?.equals?.callCount, 1)
    assert.ok(
      message.content.equals(
        // @ts-expect-error not typed hooks
        context.service.assert?.equals?._params[0].nb.content
      )
    )
    assert.ok(
      message.piece.equals(
        // @ts-expect-error not typed hooks
        context.service.assert?.equals?._params[0].nb.equals
      )
    )
  },
  'handles piece status update event successfully': async (assert, context) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }
    /** @type {PieceRecord} */
    const pieceRecord = {
      ...message,
      status: 'accepted',
      insertedAt: new Date(Date.now() - 10).toISOString(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    }

    // Handle message
    const handledMessageRes = await StorefrontEvents.handlePieceStatusUpdate(
      context,
      pieceRecord
    )
    assert.ok(handledMessageRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.filecoin?.accept?.callCount, 1)
    assert.ok(
      message.content.equals(
        // @ts-expect-error not typed hooks
        context.service.filecoin?.accept?._params[0].nb.content
      )
    )
    assert.ok(
      message.piece.equals(
        // @ts-expect-error not typed hooks
        context.service.filecoin?.accept?._params[0].nb.piece
      )
    )
  },
  'fails to handle piece status update event if unexpected state': async (
    assert,
    context
  ) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // Store piece into store
    const message = {
      piece: cargo.link.link(),
      content: cargo.content.link(),
      group: context.id.did(),
    }
    /** @type {PieceRecord} */
    const pieceRecord = {
      ...message,
      status: 'submitted',
      insertedAt: new Date(Date.now() - 10).toISOString(),
      updatedAt: new Date(Date.now() - 5).toISOString(),
    }

    // Handle message
    const handledMessageRes = await StorefrontEvents.handlePieceStatusUpdate(
      context,
      pieceRecord
    )
    assert.ok(handledMessageRes.error)
    assert.equal(handledMessageRes.error?.name, UnexpectedStateErrorName)
  },
  'handles cron tick successfully to modify status': async (
    assert,
    context
  ) => {
    const { dealer } = await getServiceContext()
    const group = context.id.did()

    // Create piece and aggregate for test
    const { aggregate, pieces } = await randomAggregate(10, 128)
    const piece = pieces[0]
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    // Store pieces into store
    await Promise.all(
      pieces.map(async (p) => {
        const putRes = await context.pieceStore.put({
          piece: p.link,
          content: p.content,
          group: context.id.did(),
          status: 'submitted',
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        assert.ok(putRes.ok)
      })
    )

    // Create inclusion proof for test
    const inclusionProof = aggregate.resolveProof(piece.link)
    if (inclusionProof.error) {
      throw new Error('could not compute inclusion proof')
    }

    // Cron ticks with no deals or receipts still available
    const handledCronTickResBeforeAnyReceipt =
      await StorefrontEvents.handleCronTick(context)
    assert.ok(handledCronTickResBeforeAnyReceipt.ok)
    assert.equal(handledCronTickResBeforeAnyReceipt.ok?.updatedCount, 0)
    assert.equal(
      handledCronTickResBeforeAnyReceipt.ok?.pendingCount,
      pieces.length
    )

    // Create invocations and receipts for chain into DealDataProof
    const dealMetadata = {
      dataType: 0n,
      dataSource: {
        dealID: 100n,
      },
    }

    // Create invocation and receipts chain until deal
    const { invocations, receipts } =
      await createInvocationsAndReceiptsForDealDataProofChain({
        storefront: context.id,
        aggregator: context.aggregatorId,
        dealer,
        aggregate: aggregate.link,
        group,
        piece: piece.link,
        content: piece.content,
        piecesBlock,
        inclusionProof: {
          subtree: inclusionProof.ok[0],
          index: inclusionProof.ok[1],
        },
        aggregateAcceptStatus: {
          ...dealMetadata,
          aggregate: aggregate.link,
        },
      })

    // Store all invocations and receipts, except for the very last receipt on the chain
    const storedInvocationsAndReceiptsRes = await storeInvocationsAndReceipts({
      invocations,
      receipts: {
        pieceOfferReceipt: receipts.pieceOfferReceipt,
        pieceAcceptReceipt: receipts.pieceAcceptReceipt,
        aggregateOfferReceipt: receipts.aggregateOfferReceipt,
      },
      taskStore: context.taskStore,
      receiptStore: context.receiptStore,
    })
    assert.ok(storedInvocationsAndReceiptsRes.ok)

    // Cron ticks with no deals or receipts still available
    const handledCronTickResBeforeFinalReceipt =
      await StorefrontEvents.handleCronTick(context)
    assert.ok(handledCronTickResBeforeFinalReceipt.ok)
    assert.equal(handledCronTickResBeforeFinalReceipt.ok?.updatedCount, 0)
    assert.equal(
      handledCronTickResBeforeFinalReceipt.ok?.pendingCount,
      pieces.length
    )

    // Store all invocations and receipts, except for the very last receipt on the chain
    const storeLastReceipt = await storeInvocationsAndReceipts({
      invocations: {},
      receipts: {
        aggregateAcceptReceipt: receipts.aggregateAcceptReceipt,
      },
      taskStore: context.taskStore,
      receiptStore: context.receiptStore,
    })
    assert.ok(storeLastReceipt.ok)

    // Cron ticks with one deal for the first piece
    const handledCronTickResAfterFinalReceipt =
      await StorefrontEvents.handleCronTick(context)
    assert.ok(handledCronTickResAfterFinalReceipt.ok)
    assert.equal(handledCronTickResAfterFinalReceipt.ok?.updatedCount, 1)
    assert.equal(
      handledCronTickResAfterFinalReceipt.ok?.pendingCount,
      pieces.length - 1
    )
  },
  'handles cron tick error attempting to find pieces to track':
    wichMockableContext(
      async (assert, context) => {
        // Cron ticks with no deals or receipts still available
        const handledCronTickResBeforeAnyReceipt =
          await StorefrontEvents.handleCronTick(context)
        assert.ok(handledCronTickResBeforeAnyReceipt.error)
        assert.equal(
          handledCronTickResBeforeAnyReceipt.error?.name,
          StoreOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        pieceStore: getStoreImplementations(FailingStore).storefront.pieceStore,
      })
    ),
}

/**
 * @param {API.Test<TestAPI.StorefrontTestEventsContext>} testFn
 * @param {(context: TestAPI.StorefrontTestEventsContext) => Promise<TestAPI.StorefrontTestEventsContext>} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return async function (...args) {
    const modifiedArgs = [args[0], await mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}

async function getServiceContext() {
  const dealer = await Signer.generate()

  return { dealer }
}

/**
 * @param {object} context
 * @param {Record<string, import('@ucanto/interface').Invocation>} context.invocations
 * @param {Record<string, import('@ucanto/interface').Receipt>} context.receipts
 * @param {API.Store<import('@ucanto/interface').UnknownLink, API.UcantoInterface.Invocation>} context.taskStore
 * @param {API.Store<import('@ucanto/interface').UnknownLink, API.UcantoInterface.Receipt>} context.receiptStore
 */
async function storeInvocationsAndReceipts({
  invocations,
  receipts,
  taskStore,
  receiptStore,
}) {
  // Store invocations
  const storedInvocations = await Promise.all(
    Object.values(invocations).map((invocation) => {
      return taskStore.put(invocation)
    })
  )
  if (storedInvocations.find((si) => si.error)) {
    throw new Error('failed to store test invocations')
  }
  // Store receipts
  const storedReceipts = await Promise.all(
    Object.values(receipts).map((receipt) => {
      return receiptStore.put(receipt)
    })
  )
  if (storedReceipts.find((si) => si.error)) {
    throw new Error('failed to store test receipts')
  }

  return {
    ok: {},
  }
}
