import { Filecoin, Aggregator } from '@storacha/capabilities'
import * as Server from '@ucanto/server'
import { CBOR } from '@ucanto/core'
import * as Signer from '@ucanto/principal/ed25519'
import * as DealTrackerCaps from '@storacha/capabilities/filecoin/deal-tracker'
import pWaitFor from 'p-wait-for'

import * as API from '../../src/types.js'
import * as StorefrontApi from '../../src/storefront/api.js'

import { createServer, connect } from '../../src/storefront/service.js'
import {
  QueueOperationErrorName,
  StoreOperationErrorName,
  UnsupportedCapabilityErrorName,
} from '../../src/errors.js'
import { randomCargo, randomAggregate } from '../utils.js'
import { createInvocationsAndReceiptsForDealDataProofChain } from '../context/receipts.js'
import { FailingStore } from '../context/store.js'
import { FailingQueue } from '../context/queue.js'
import { mockService } from '../context/mocks.js'
import { getConnection } from '../context/service.js'

/**
 * @typedef {import('../../src/storefront/api.js').PieceRecord} PieceRecord
 * @typedef {import('../../src/storefront/api.js').PieceRecordKey} PieceRecordKey
 */

/**
 * @type {API.Tests<StorefrontApi.ServiceContext>}
 */
export const test = {
  'filecoin/offer inserts piece into submission queue if not in piece store and returns effects':
    async (assert, context) => {
      const { agent } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // agent invocation
      const filecoinAddInv = Filecoin.offer.invoke({
        issuer: agent,
        audience: connection.id,
        with: agent.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })

      const response = await filecoinAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate effects in receipt
      const fxFork = await Filecoin.submit
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
          expiration: Infinity,
        })
        .delegate()
      const fxJoin = await Filecoin.accept
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
          expiration: Infinity,
        })
        .delegate()

      assert.ok(response.fx.join)
      assert.ok(fxJoin.link().equals(response.fx.join?.link()))
      assert.equal(response.fx.fork.length, 1)
      assert.ok(fxFork.link().equals(response.fx.fork[0].link()))

      // Validate queue and store
      await pWaitFor(
        () => context.queuedMessages.get('filecoinSubmitQueue')?.length === 1
      )

      // Piece not yet stored
      const hasStoredPiece = await context.pieceStore.get({
        piece: cargo.link.link(),
      })
      assert.ok(!hasStoredPiece.ok)
    },
  'filecoin/offer dedupes piece and returns effects without propagating message':
    async (assert, context) => {
      const { agent } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // Store piece into store
      const putRes = await context.pieceStore.put({
        piece: cargo.link.link(),
        content: cargo.content.link(),
        group: context.id.did(),
        status: 'submitted',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      assert.ok(putRes.ok)

      // agent invocation
      const filecoinAddInv = Filecoin.offer.invoke({
        issuer: agent,
        audience: connection.id,
        with: agent.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })

      const response = await filecoinAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate effects in receipt
      const fxFork = await Filecoin.submit
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
          expiration: Infinity,
        })
        .delegate()
      const fxJoin = await Filecoin.accept
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
          expiration: Infinity,
        })
        .delegate()

      assert.ok(response.fx.join)
      assert.ok(fxJoin.link().equals(response.fx.join?.link()))
      assert.equal(response.fx.fork.length, 1)
      assert.ok(fxFork.link().equals(response.fx.fork[0].link()))

      // Validate queue has no new message
      await pWaitFor(
        () => context.queuedMessages.get('filecoinSubmitQueue')?.length === 0
      )
    },
  'filecoin/offer invocation fails if fails to write to submission queue':
    wichMockableContext(
      async (assert, context) => {
        const { agent } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)

        // agent invocation
        const filecoinAddInv = Filecoin.offer.invoke({
          issuer: agent,
          audience: connection.id,
          with: agent.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
        })

        const response = await filecoinAddInv.execute(connection)
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, QueueOperationErrorName)
      },
      async (context) => ({
        ...context,
        filecoinSubmitQueue: new FailingQueue(),
      })
    ),
  'filecoin/offer invocation fails if fails to check piece store':
    wichMockableContext(
      async (assert, context) => {
        const { agent } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)

        // agent invocation
        const filecoinAddInv = Filecoin.offer.invoke({
          issuer: agent,
          audience: connection.id,
          with: agent.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
        })

        const response = await filecoinAddInv.execute(connection)
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceStore: new FailingStore(),
      })
    ),
  'filecoin/submit must be invoked on service did': async (assert, context) => {
    const { agent } = await getServiceContext(context.id)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    const filecoinSubmitInv = Filecoin.submit.invoke({
      issuer: agent,
      audience: connection.id,
      with: agent.did(),
      nb: {
        piece: cargo.link.link(),
        content: cargo.content.link(),
      },
    })

    const response = await filecoinSubmitInv.execute(connection)
    assert.ok(response.out.error)
    assert.equal(response.out.error?.name, UnsupportedCapabilityErrorName)
  },
  'filecoin/submit inserts piece into piece offer queue and returns effect':
    async (assert, context) => {
      const { storefront } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const filecoinSubmitInv = Filecoin.submit.invoke({
        issuer: storefront,
        audience: connection.id,
        with: storefront.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })

      const response = await filecoinSubmitInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate effects in receipt
      const fxJoin = await Aggregator.pieceOffer
        .invoke({
          issuer: context.id,
          audience: context.aggregatorId,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            group: context.id.did(),
          },
          expiration: Infinity,
        })
        .delegate()

      assert.ok(response.fx.join)
      assert.ok(fxJoin.link().equals(response.fx.join?.link()))
    },
  'filecoin/submit fails if fails to write to submission queue':
    wichMockableContext(
      async (assert, context) => {
        const { storefront } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)
        const filecoinSubmitInv = Filecoin.submit.invoke({
          issuer: storefront,
          audience: connection.id,
          with: storefront.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
        })

        const response = await filecoinSubmitInv.execute(connection)
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, QueueOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceOfferQueue: new FailingQueue(),
      })
    ),
  'filecoin/accept issues receipt with data aggregation proof': async (
    assert,
    context
  ) => {
    const { storefront, aggregator, dealer } = await getServiceContext(
      context.id
    )
    const group = context.id.did()
    const connection = connect({
      id: context.id,
      channel: createServer({
        ...context,
        aggregatorId: aggregator,
      }),
    })

    // Create piece and aggregate for test
    const { aggregate, pieces } = await randomAggregate(10, 128)
    const piece = pieces[0]
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    // Store piece into store
    const putRes = await context.pieceStore.put({
      piece: piece.link,
      content: piece.content,
      group: storefront.did(),
      status: 'submitted',
      insertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    assert.ok(putRes.ok)

    // Create inclusion proof for test
    const inclusionProof = aggregate.resolveProof(piece.link)
    if (inclusionProof.error) {
      throw new Error('could not compute inclusion proof')
    }

    // Create invocations and receipts for chain into DealDataProof
    const dealMetadata = {
      dataType: 0n,
      dataSource: {
        dealID: 100n,
      },
    }
    const { invocations, receipts } =
      await createInvocationsAndReceiptsForDealDataProofChain({
        storefront,
        aggregator,
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

    const storedInvocationsAndReceiptsRes = await storeInvocationsAndReceipts({
      invocations,
      receipts,
      taskStore: context.taskStore,
      receiptStore: context.receiptStore,
    })
    assert.ok(storedInvocationsAndReceiptsRes.ok)

    const filecoinAddInv = Filecoin.accept.invoke({
      issuer: storefront,
      audience: connection.id,
      with: storefront.did(),
      nb: {
        piece: piece.link.link(),
        content: piece.content.link(),
      },
    })

    const response = await filecoinAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.deepEqual(
      response.out.ok.inclusion.subtree[1],
      inclusionProof.ok[0][1]
    )
    assert.deepEqual(
      response.out.ok.inclusion.index[1],
      inclusionProof.ok[1][1]
    )
    assert.deepEqual(
      BigInt(response.out.ok.inclusion.subtree[0]),
      BigInt(inclusionProof.ok[0][0])
    )
    assert.deepEqual(
      BigInt(response.out.ok.inclusion.index[0]),
      BigInt(inclusionProof.ok[1][0])
    )
    assert.deepEqual(
      BigInt(response.out.ok.aux.dataType),
      BigInt(dealMetadata.dataType)
    )
    assert.deepEqual(
      BigInt(response.out.ok.aux.dataSource.dealID),
      BigInt(dealMetadata.dataSource.dealID)
    )
  },
  'filecoin/accept must be invoked on service did': async (assert, context) => {
    const { agent } = await getServiceContext(context.id)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    const filecoinSubmitInv = Filecoin.accept.invoke({
      issuer: agent,
      audience: connection.id,
      with: agent.did(),
      nb: {
        piece: cargo.link.link(),
        content: cargo.content.link(),
      },
    })

    const response = await filecoinSubmitInv.execute(connection)
    assert.ok(response.out.error)
    assert.equal(response.out.error?.name, UnsupportedCapabilityErrorName)
  },
  'filecoin/accept fails if fails to read from piece store':
    wichMockableContext(
      async (assert, context) => {
        const { storefront } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)
        const filecoinSubmitInv = Filecoin.accept.invoke({
          issuer: storefront,
          audience: connection.id,
          with: storefront.did(),
          nb: {
            piece: cargo.link.link(),
            content: cargo.content.link(),
          },
        })

        const response = await filecoinSubmitInv.execute(connection)
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceStore: new FailingStore(),
      })
    ),
  'filecoin/info gets aggregate where piece was included together with deals and inclusion proof':
    wichMockableContext(
      async (assert, context) => {
        const { agent, storefront, aggregator, dealer } =
          await getServiceContext(context.id)
        const group = context.id.did()
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Create piece and aggregate for test
        const { aggregate, pieces } = await randomAggregate(10, 128)
        const piece = pieces[0]
        const offer = pieces.map((p) => p.link)
        const piecesBlock = await CBOR.write(offer)

        // Store piece into store
        const putRes = await context.pieceStore.put({
          piece: piece.link.link(),
          content: piece.content.link(),
          group: context.id.did(),
          status: 'submitted',
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        assert.ok(putRes.ok)

        // Create inclusion proof for test
        const inclusionProof = aggregate.resolveProof(piece.link)
        if (inclusionProof.error) {
          throw new Error('could not compute inclusion proof')
        }

        // Create invocations and receipts for chain into DealDataProof
        const dealMetadata = {
          dataType: 0n,
          dataSource: {
            dealID: 111n,
          },
        }
        const { invocations, receipts } =
          await createInvocationsAndReceiptsForDealDataProofChain({
            storefront,
            aggregator,
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

        const storedInvocationsAndReceiptsRes =
          await storeInvocationsAndReceipts({
            invocations,
            receipts,
            taskStore: context.taskStore,
            receiptStore: context.receiptStore,
          })
        assert.ok(storedInvocationsAndReceiptsRes.ok)

        // agent invocation
        const filecoinInfoInv = Filecoin.info.invoke({
          issuer: agent,
          audience: connection.id,
          with: agent.did(),
          nb: {
            piece: piece.link.link(),
          },
        })

        const response = await filecoinInfoInv.execute(connection)
        if (response.out.error) {
          throw new Error('invocation failed', { cause: response.out.error })
        }
        assert.ok(response.out.ok)
        assert.ok(response.out.ok.piece.equals(piece.link.link()))
        assert.equal(response.out.ok.deals.length, 1)
        assert.ok(response.out.ok.deals[0].aggregate.equals(aggregate.link))
        assert.deepEqual(
          BigInt(response.out.ok.deals[0].aux.dataType),
          dealMetadata.dataType
        )
        assert.deepEqual(
          BigInt(response.out.ok.deals[0].aux.dataSource.dealID),
          dealMetadata.dataSource.dealID
        )
        const respAggregate = response.out.ok.aggregates.find((a) =>
          a.aggregate.equals(aggregate.link)
        )
        assert.ok(respAggregate?.inclusion.index)
        assert.ok(respAggregate?.inclusion.subtree)
      },
      async (context) => {
        /**
         * Mock deal tracker to return deals
         */
        const dealTrackerSigner = await Signer.generate()
        const service = mockService({
          deal: {
            info: Server.provideAdvanced({
              capability: DealTrackerCaps.dealInfo,
              handler: async () => {
                /** @type {API.UcantoInterface.OkBuilder<API.DealInfoSuccess, API.DealInfoFailure>} */
                const result = Server.ok({
                  deals: {
                    111: {
                      provider: 'f11111',
                    },
                  },
                })

                return result
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
  'filecoin/info fails if content is not known': async (assert, context) => {
    const { agent } = await getServiceContext(context.id)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Create piece and aggregate for test
    const { pieces } = await randomAggregate(10, 128)
    const piece = pieces[0]

    // agent invocation
    const filecoinInfoInv = Filecoin.info.invoke({
      issuer: agent,
      audience: connection.id,
      with: agent.did(),
      nb: {
        piece: piece.link,
      },
    })

    const response = await filecoinInfoInv.execute(connection)
    assert.ok(response.out.error)
  },
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

/**
 * @param {Signer.Signer.Signer<`did:${string}:${string}`, Signer.Signer.Crypto.SigAlg>} serviceSigner
 */
async function getServiceContext(serviceSigner) {
  const agent = await Signer.generate()
  const storefront = serviceSigner
  const aggregator = await Signer.generate()
  const dealer = await Signer.generate()

  return { agent, storefront, dealer, aggregator }
}

/**
 * @param {API.Test<StorefrontApi.ServiceContext>} testFn
 * @param {(context: StorefrontApi.ServiceContext) => Promise<StorefrontApi.ServiceContext>} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return async function (...args) {
    const modifiedArgs = [args[0], await mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}
