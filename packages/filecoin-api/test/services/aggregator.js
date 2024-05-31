import { Aggregator } from '@web3-storage/capabilities'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'
import * as Signer from '@ucanto/principal/ed25519'
import { CBOR } from '@ucanto/core'
import pWaitFor from 'p-wait-for'

import * as API from '../../src/types.js'
import * as AggregatorApi from '../../src/aggregator/api.js'

import { createServer, connect } from '../../src/aggregator/service.js'
import { randomAggregate, randomCargo } from '../utils.js'
import { FailingStore } from '../context/store.js'
import { FailingQueue } from '../context/queue.js'
import { getStoreImplementations } from '../context/store-implementations.js'
import {
  QueueOperationErrorName,
  StoreOperationErrorName,
  UnsupportedCapabilityErrorName,
} from '../../src/errors.js'

/**
 * @typedef {import('@web3-storage/data-segment').PieceLink} PieceLink
 * @typedef {import('@ucanto/interface').Link} Link
 * @typedef {import('../../src/aggregator/api.js').Buffer} Buffer
 * @typedef {import('../../src/aggregator/api.js').PieceRecord} PieceRecord
 * @typedef {import('../../src/aggregator/api.js').PieceRecordKey} PieceRecordKey
 * @typedef {import('../../src/aggregator/api.js').BufferRecord} BufferRecord
 * @typedef {import('../../src/aggregator/api.js').AggregateRecord} AggregateRecord
 * @typedef {import('../../src/aggregator/api.js').AggregateRecordKey} AggregateRecordKey
 * @typedef {import('../../src/aggregator/api.js').InclusionRecord} InclusionRecord
 * @typedef {import('../../src/aggregator/api.js').InclusionRecordKey} InclusionRecordKey
 */

/**
 * @type {API.Tests<AggregatorApi.ServiceContext>}
 */
export const test = {
  'piece/offer inserts piece into piece queue if not in piece store and returns effects':
    async (assert, context) => {
      const { storefront } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const group = 'did:web:free.web3.storage'

      // storefront invocation
      const pieceAddInv = Aggregator.pieceOffer.invoke({
        issuer: storefront,
        audience: connection.id,
        with: storefront.did(),
        nb: {
          piece: cargo.link.link(),
          group,
        },
      })

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate effect in receipt
      const fxJoin = await Aggregator.pieceAccept
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            group,
          },
          expiration: Infinity,
        })
        .delegate()

      assert.ok(response.fx.join)
      assert.ok(fxJoin.link().equals(response.fx.join?.link()))

      // Validate queue and store
      await pWaitFor(
        () => context.queuedMessages.get('pieceQueue')?.length === 1
      )

      // Piece not yet stored
      const hasStoredPiece = await context.pieceStore.get({
        piece: cargo.link.link(),
        group,
      })
      assert.ok(!hasStoredPiece.ok)
    },
  'piece/offer dedupes piece and returns effects without propagating message':
    async (assert, context) => {
      const { storefront } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const group = 'did:web:free.web3.storage'

      // Store piece into store
      const putRes = await context.pieceStore.put({
        piece: cargo.link.link(),
        group: context.id.did(),
        status: 'offered',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      assert.ok(putRes.ok)

      // storefront invocation
      const pieceAddInv = Aggregator.pieceOffer.invoke({
        issuer: storefront,
        audience: connection.id,
        with: storefront.did(),
        nb: {
          piece: cargo.link.link(),
          group,
        },
      })

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate effect in receipt
      const fxJoin = await Aggregator.pieceAccept
        .invoke({
          issuer: context.id,
          audience: context.id,
          with: context.id.did(),
          nb: {
            piece: cargo.link.link(),
            group,
          },
          expiration: Infinity,
        })
        .delegate()

      assert.ok(response.fx.join)
      assert.ok(fxJoin.link().equals(response.fx.join?.link()))

      // Validate queue has no new message
      await pWaitFor(
        () => context.queuedMessages.get('pieceQueue')?.length === 0
      )
    },
  'piece/offer fails if not able to verify piece store': wichMockableContext(
    async (assert, context) => {
      const { storefront } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const group = 'did:web:free.web3.storage'

      // storefront invocation
      const pieceAddInv = Aggregator.pieceOffer.invoke({
        issuer: storefront,
        audience: connection.id,
        with: storefront.did(),
        nb: {
          piece: cargo.link.link(),
          group,
        },
      })

      const response = await pieceAddInv.execute(connection)
      assert.ok(response.out.error)
      // @ts-ignore
      assert.equal(response.out.error?.name, StoreOperationErrorName)
    },
    (context) => ({
      ...context,
      pieceStore: getStoreImplementations(FailingStore).aggregator.pieceStore,
    })
  ),
  'piece/offer fails if not able to add to piece queue': wichMockableContext(
    async (assert, context) => {
      const { storefront } = await getServiceContext(context.id)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const group = 'did:web:free.web3.storage'

      // storefront invocation
      const pieceAddInv = Aggregator.pieceOffer.invoke({
        issuer: storefront,
        audience: connection.id,
        with: storefront.did(),
        nb: {
          piece: cargo.link.link(),
          group,
        },
      })

      const response = await pieceAddInv.execute(connection)
      assert.ok(response.out.error)
      // @ts-ignore
      assert.equal(response.out.error?.name, QueueOperationErrorName)
    },
    (context) => ({
      ...context,
      pieceQueue: new FailingQueue(),
    })
  ),
  'piece/accept must be invoked on service did': async (assert, context) => {
    const { agent, storefront } = await getServiceContext(context.id)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const group = storefront.did()
    const { pieces } = await randomAggregate(100, 128)
    const piece = pieces[0].link

    // agent invocation instead of storefront
    const pieceAcceptInv = Aggregator.pieceAccept.invoke({
      issuer: agent,
      audience: connection.id,
      with: agent.did(),
      nb: {
        piece,
        group,
      },
    })

    const response = await pieceAcceptInv.execute(connection)
    // Validate receipt
    assert.ok(response.out.error)
    assert.equal(response.out.error?.name, UnsupportedCapabilityErrorName)
  },
  'piece/accept issues receipt with data aggregation proof': async (
    assert,
    context
  ) => {
    const { storefront, aggregator } = await getServiceContext(context.id)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const group = storefront.did()
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const piece = pieces[0].link
    /** @type {Buffer} */
    const buffer = {
      pieces: pieces.map((p) => ({
        piece: p.link,
        insertedAt: new Date().toISOString(),
        policy: 0,
      })),
      group,
    }
    const block = await CBOR.write(buffer)

    // Store aggregate record into store
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    const aggregatePutRes = await context.aggregateStore.put({
      aggregate: aggregate.link,
      pieces: piecesBlock.cid,
      buffer: block.cid,
      group,
      insertedAt: new Date().toISOString(),
      minPieceInsertedAt: new Date().toISOString(),
    })
    assert.ok(aggregatePutRes.ok)

    // compute proof for piece in aggregate
    const proof = aggregate.resolveProof(piece)
    if (proof.error) {
      throw new Error('could not compute proof')
    }

    // Store inclusion record into store
    const inclusionPutRes = await context.inclusionStore.put({
      piece,
      aggregate: aggregate.link,
      group,
      inclusion: {
        subtree: proof.ok[0],
        index: proof.ok[1],
      },
      insertedAt: new Date().toISOString(),
    })
    assert.ok(inclusionPutRes.ok)

    // aggregator invocation
    const pieceAcceptInv = Aggregator.pieceAccept.invoke({
      issuer: aggregator,
      audience: connection.id,
      with: aggregator.did(),
      nb: {
        piece,
        group,
      },
      expiration: Infinity,
    })

    const response = await pieceAcceptInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    // Validate receipt
    assert.ok(response.out.ok)
    assert.ok(response.out.ok.piece.equals(piece.link()))
    assert.ok(response.out.ok.aggregate.equals(aggregate.link))
    assert.equal(
      BigInt(response.out.ok.inclusion.subtree[0]),
      BigInt(proof.ok[0][0])
    )
    assert.deepEqual(response.out.ok.inclusion.subtree[1], proof.ok[0][1])
    assert.equal(
      BigInt(response.out.ok.inclusion.index[0]),
      BigInt(proof.ok[1][0])
    )
    assert.deepEqual(response.out.ok.inclusion.index[1], proof.ok[1][1])

    // Validate effect in receipt
    const fxJoin = await DealerCaps.aggregateOffer
      .invoke({
        issuer: context.id,
        audience: context.dealerId,
        with: context.id.did(),
        nb: {
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
        },
        expiration: Infinity,
      })
      .delegate()
    assert.ok(response.fx.join)
    assert.ok(fxJoin.link().equals(response.fx.join?.link()))
  },
  'piece/accept fails if not able to query inclusion store':
    wichMockableContext(
      async (assert, context) => {
        const { storefront, aggregator } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const group = storefront.did()
        const { pieces } = await randomAggregate(100, 128)
        const piece = pieces[0].link

        // aggregator invocation
        const pieceAcceptInv = Aggregator.pieceAccept.invoke({
          issuer: aggregator,
          audience: connection.id,
          with: aggregator.did(),
          nb: {
            piece,
            group,
          },
        })

        const response = await pieceAcceptInv.execute(connection)
        // Validate receipt
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, StoreOperationErrorName)
      },
      (context) => ({
        ...context,
        inclusionStore:
          getStoreImplementations(FailingStore).aggregator.inclusionStore,
      })
    ),
  'piece/accept fails if not able to read from aggregate store':
    wichMockableContext(
      async (assert, context) => {
        const { storefront, aggregator } = await getServiceContext(context.id)
        const connection = connect({
          id: context.id,
          channel: createServer(context),
        })

        // Generate piece for test
        const group = storefront.did()
        const { pieces, aggregate } = await randomAggregate(100, 128)
        const piece = pieces[0].link

        // compute proof for piece in aggregate
        const proof = aggregate.resolveProof(piece)
        if (proof.error) {
          throw new Error('could not compute proof')
        }

        // Store inclusion record into store
        const inclusionPutRes = await context.inclusionStore.put({
          piece,
          aggregate: aggregate.link,
          group,
          inclusion: {
            subtree: proof.ok[0],
            index: proof.ok[1],
          },
          insertedAt: new Date().toISOString(),
        })
        assert.ok(inclusionPutRes.ok)

        // aggregator invocation
        const pieceAcceptInv = Aggregator.pieceAccept.invoke({
          issuer: aggregator,
          audience: connection.id,
          with: aggregator.did(),
          nb: {
            piece,
            group,
          },
        })

        const response = await pieceAcceptInv.execute(connection)
        // Validate receipt
        assert.ok(response.out.error)
        assert.equal(response.out.error?.name, StoreOperationErrorName)
      },
      (context) => ({
        ...context,
        aggregateStore:
          getStoreImplementations(FailingStore).aggregator.aggregateStore,
      })
    ),
}

/**
 * @param {Signer.Signer.Signer<`did:${string}:${string}`, Signer.Signer.Crypto.SigAlg>} serviceSigner
 */
async function getServiceContext(serviceSigner) {
  const agent = await Signer.generate()
  // Storefront and aggregator are today the same DID
  const storefront = serviceSigner
  const aggregator = serviceSigner

  return { agent, storefront, aggregator }
}

/**
 * @param {API.Test<AggregatorApi.ServiceContext>} testFn
 * @param {(context: AggregatorApi.ServiceContext) => AggregatorApi.ServiceContext} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return function (...args) {
    const modifiedArgs = [args[0], mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}
