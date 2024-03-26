import * as Server from '@ucanto/server'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import pWaitFor from 'p-wait-for'
import { CBOR } from '@ucanto/core'

import * as API from '../../src/types.js'
import * as TestAPI from '../types.js'
import * as AggregatorEvents from '../../src/aggregator/events.js'
import { getBufferedPieces } from '../../src/aggregator/buffer-reducing.js'

import { FailingStore } from '../context/store.js'
import { FailingQueue } from '../context/queue.js'
import { mockService } from '../context/mocks.js'
import { getConnection } from '../context/service.js'
import { getStoreImplementations } from '../context/store-implementations.js'
import { randomAggregate, randomCargo } from '../utils.js'
import {
  QueueOperationErrorName,
  RecordNotFoundErrorName,
  StoreOperationErrorName,
} from '../../src/errors.js'

/**
 * @typedef {import('../../src/aggregator/api.js').Buffer} Buffer
 * @typedef {import('../../src/aggregator/api.js').PiecePolicy} PiecePolicy
 *
 * @typedef {import('../../src/aggregator/api.js').PieceMessage} PieceMessage
 * @typedef {import('../../src/aggregator/api.js').BufferMessage} BufferMessage
 * @typedef {import('../../src/aggregator/api.js').AggregateOfferMessage} AggregateOfferMessage
 * @typedef {import('../../src/aggregator/api.js').PieceAcceptMessage} PieceAcceptMessage
 */

/**
 * @type {API.Tests<TestAPI.AggregatorTestEventsContext>}
 */
export const test = {
  'handles piece queue messages successfully': async (assert, context) => {
    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    /** @type {PieceMessage} */
    const message = {
      piece: cargo.link.link(),
      group: context.id.did(),
    }

    // Handle message
    const handledMessageRes = await AggregatorEvents.handlePieceMessage(
      context,
      message
    )
    assert.ok(handledMessageRes.ok)

    // Verify store
    const hasStoredPiece = await context.pieceStore.get({
      piece: message.piece,
      group: message.group,
    })
    assert.ok(hasStoredPiece.ok)
    assert.equal(hasStoredPiece.ok?.status, 'offered')
    assert.ok(hasStoredPiece.ok?.insertedAt)
    assert.ok(hasStoredPiece.ok?.updatedAt)
  },
  'handles piece queue message errors when fails to access piece store':
    wichMockableContext(
      async (assert, context) => {
        // Generate piece for test
        const [cargo] = await randomCargo(1, 128)
        /** @type {PieceMessage} */
        const message = {
          piece: cargo.link.link(),
          group: context.id.did(),
        }

        // Handle message
        const handledMessageRes = await AggregatorEvents.handlePieceMessage(
          context,
          message
        )
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceStore: getStoreImplementations(FailingStore).aggregator.pieceStore,
      })
    ),
  'handles pieces insert batch successfully': async (assert, context) => {
    const group = context.id.did()
    const { pieces } = await randomAggregate(100, 128)

    // Handle event
    const handledPieceInsertsRes = await AggregatorEvents.handlePiecesInsert(
      context,
      pieces.map((p) => ({
        piece: p.link,
        group,
        status: 'offered',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    )
    assert.ok(handledPieceInsertsRes.ok)

    // Validate queue and store
    await pWaitFor(
      () => context.queuedMessages.get('bufferQueue')?.length === 1
    )
    /** @type {BufferMessage} */
    // @ts-expect-error cannot infer buffer message
    const message = context.queuedMessages.get('bufferQueue')?.[0]

    const bufferGet = await context.bufferStore.get(message.pieces)
    assert.ok(bufferGet.ok)
    assert.ok(bufferGet.ok?.block.equals(message.pieces))
    assert.deepEqual(
      bufferGet.ok?.buffer.pieces.map((p) => p.piece.toString()),
      pieces.map((p) => p.link.toString())
    )
  },
  'handles piece insert event errors when fails to access buffer store':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { pieces } = await randomAggregate(100, 128)

        // Handle event
        const handledPieceInsertsRes =
          await AggregatorEvents.handlePiecesInsert(
            context,
            pieces.map((p) => ({
              piece: p.link,
              group,
              status: 'offered',
              insertedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          )
        assert.ok(handledPieceInsertsRes.error)
        assert.equal(
          handledPieceInsertsRes.error?.name,
          StoreOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        bufferStore:
          getStoreImplementations(FailingStore).aggregator.bufferStore,
      })
    ),
  'handles piece insert event errors when fails to access buffer queue':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { pieces } = await randomAggregate(100, 128)

        // Handle event
        const handledPieceInsertsRes =
          await AggregatorEvents.handlePiecesInsert(
            context,
            pieces.map((p) => ({
              piece: p.link,
              group,
              status: 'offered',
              insertedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          )
        assert.ok(handledPieceInsertsRes.error)
        assert.equal(
          handledPieceInsertsRes.error?.name,
          QueueOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        bufferQueue: new FailingQueue(),
      })
    ),
  'handles buffer queue messages repeated items as unique': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { buffers, blocks } = await getBuffers(1, group)

    // Store buffers
    for (let i = 0; i < blocks.length; i++) {
      const putBufferRes = await context.bufferStore.put({
        buffer: buffers[i],
        block: blocks[i].cid,
      })
      assert.ok(putBufferRes.ok)
    }

    const bufferedPieces = await getBufferedPieces(
      [blocks[0].cid, blocks[0].cid],
      context.bufferStore
    )

    assert.equal(
      bufferedPieces.ok?.bufferedPieces.length,
      buffers[0].pieces.length
    )
  },
  'handles buffer queue messages successfully to requeue bigger buffer': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { buffers, blocks } = await getBuffers(2, group)

    // Store buffers
    for (let i = 0; i < blocks.length; i++) {
      const putBufferRes = await context.bufferStore.put({
        buffer: buffers[i],
        block: blocks[i].cid,
      })
      assert.ok(putBufferRes.ok)
    }

    // Handle messages
    const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
      {
        ...context,
        config: {
          minAggregateSize: 2 ** 34,
          minUtilizationFactor: 4,
          maxAggregateSize: 2 ** 35,
        },
      },
      blocks.map((b) => ({
        pieces: b.cid,
        group,
      }))
    )
    assert.ok(handledMessageRes.ok)
    assert.equal(handledMessageRes.ok?.aggregatedPieces, 0)

    // Validate queue and store
    await pWaitFor(
      () => context.queuedMessages.get('bufferQueue')?.length === 1
    )
    /** @type {BufferMessage} */
    // @ts-expect-error cannot infer buffer message
    const message = context.queuedMessages.get('bufferQueue')?.[0]

    const bufferGet = await context.bufferStore.get(message.pieces)
    assert.ok(bufferGet.ok)
    assert.ok(bufferGet.ok?.block.equals(message.pieces))
    assert.equal(bufferGet.ok?.buffer.group, group)
    assert.ok(!bufferGet.ok?.buffer.aggregate)
    assert.equal(
      bufferGet.ok?.buffer.pieces.length,
      buffers.reduce((acc, v) => {
        acc += v.pieces.length
        return acc
      }, 0)
    )
  },
  'handles buffer queue messages with failure when fails to read them from store':
    async (assert, context) => {
      const group = context.id.did()
      const { blocks } = await getBuffers(2, group)

      // Handle messages
      const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
        context,
        blocks.map((b) => ({
          pieces: b.cid,
          group,
        }))
      )
      assert.ok(handledMessageRes.error)
      assert.equal(handledMessageRes.error?.name, RecordNotFoundErrorName)
    },
  'handles buffer queue messages successfully to requeue bigger buffer if does not have minimum utilization':
    async (assert, context) => {
      const group = context.id.did()
      const { buffers, blocks } = await getBuffers(2, group, {
        length: 10,
        size: 1024,
      })

      // Store buffers
      for (let i = 0; i < blocks.length; i++) {
        const putBufferRes = await context.bufferStore.put({
          buffer: buffers[i],
          block: blocks[i].cid,
        })
        assert.ok(putBufferRes.ok)
      }

      // Handle messages
      const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
        {
          ...context,
          config: {
            minAggregateSize: 2 ** 13,
            minUtilizationFactor: 1,
            maxAggregateSize: 2 ** 18,
          },
        },
        blocks.map((b) => ({
          pieces: b.cid,
          group,
        }))
      )
      assert.ok(handledMessageRes.ok)
      assert.equal(handledMessageRes.ok?.aggregatedPieces, 0)

      // Validate queue and store
      await pWaitFor(
        () => context.queuedMessages.get('bufferQueue')?.length === 1
      )
      /** @type {BufferMessage} */
      // @ts-expect-error cannot infer buffer message
      const message = context.queuedMessages.get('bufferQueue')?.[0]

      const bufferGet = await context.bufferStore.get(message.pieces)
      assert.ok(bufferGet.ok)
      assert.ok(bufferGet.ok?.block.equals(message.pieces))
      assert.equal(bufferGet.ok?.buffer.group, group)
      assert.ok(!bufferGet.ok?.buffer.aggregate)
      assert.equal(
        bufferGet.ok?.buffer.pieces.length,
        buffers.reduce((acc, v) => {
          acc += v.pieces.length
          return acc
        }, 0)
      )
    },
  'handles buffer queue messages successfully to queue aggregate': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { buffers, blocks } = await getBuffers(2, group, {
      length: 100,
      size: 128,
    })
    const totalPieces = buffers.reduce((acc, v) => {
      acc += v.pieces.length
      return acc
    }, 0)

    // Store buffers
    for (let i = 0; i < blocks.length; i++) {
      const putBufferRes = await context.bufferStore.put({
        buffer: buffers[i],
        block: blocks[i].cid,
      })
      assert.ok(putBufferRes.ok)
    }

    // Handle messages
    const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
      {
        ...context,
        config: {
          minAggregateSize: 2 ** 19,
          minUtilizationFactor: 10e5,
          maxAggregateSize: 2 ** 35,
        },
      },
      blocks.map((b) => ({
        pieces: b.cid,
        group,
      }))
    )
    assert.ok(handledMessageRes.ok)
    assert.equal(handledMessageRes.ok?.aggregatedPieces, totalPieces)

    // Validate queue and store
    await pWaitFor(
      () =>
        context.queuedMessages.get('bufferQueue')?.length === 0 &&
        context.queuedMessages.get('aggregateOfferQueue')?.length === 1
    )
    /** @type {AggregateOfferMessage} */
    // @ts-expect-error cannot infer buffer message
    const message = context.queuedMessages.get('aggregateOfferQueue')?.[0]
    const bufferGet = await context.bufferStore.get(message.buffer)
    assert.ok(bufferGet.ok)
    assert.ok(bufferGet.ok?.block.equals(message.buffer))
    assert.equal(bufferGet.ok?.buffer.group, group)
    assert.ok(message.aggregate.equals(bufferGet.ok?.buffer.aggregate))
    assert.equal(bufferGet.ok?.buffer.pieces.length, totalPieces)
    // Validate min piece date
    assert.ok(message.minPieceInsertedAt)

    const minPieceInsertedAtDate = new Date(
      Math.min(
        ...(bufferGet.ok?.buffer.pieces?.map((bf) =>
          new Date(bf.insertedAt).getTime()
        ) || [])
      )
    )
    assert.equal(
      minPieceInsertedAtDate.toISOString(),
      message.minPieceInsertedAt
    )
  },
  'handles buffer queue messages successfully to queue aggregate prepended with a buffer piece':
    async (assert, context) => {
      const group = context.id.did()
      const { buffers, blocks } = await getBuffers(2, group, {
        length: 100,
        size: 128,
      })

      const [cargo] = await randomCargo(1, 128)
      /** @type {import('../../src/aggregator/api.js').BufferedPiece} */
      const bufferedPiece = {
        piece: cargo.link.link(),
        policy: 0,
        insertedAt: new Date().toISOString(),
      }

      const totalPieces = buffers.reduce((acc, v) => {
        acc += v.pieces.length
        return acc
      }, 0)

      // Store buffers
      for (let i = 0; i < blocks.length; i++) {
        const putBufferRes = await context.bufferStore.put({
          buffer: buffers[i],
          block: blocks[i].cid,
        })
        assert.ok(putBufferRes.ok)
      }

      // Handle messages
      const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
        {
          ...context,
          config: {
            minAggregateSize: 2 ** 19,
            minUtilizationFactor: 10e5,
            maxAggregateSize: 2 ** 35,
            prependBufferedPieces: [bufferedPiece],
          },
        },
        blocks.map((b) => ({
          pieces: b.cid,
          group,
        }))
      )
      assert.ok(handledMessageRes.ok)
      assert.equal(handledMessageRes.ok?.aggregatedPieces, totalPieces + 1)

      // Validate queue and store
      await pWaitFor(
        () => context.queuedMessages.get('aggregateOfferQueue')?.length === 1
      )

      /** @type {AggregateOfferMessage} */
      // @ts-expect-error cannot infer buffer message
      const message = context.queuedMessages.get('aggregateOfferQueue')?.[0]
      const bufferGet = await context.bufferStore.get(message.buffer)
      assert.ok(bufferGet.ok)
      assert.ok(bufferGet.ok?.block.equals(message.buffer))
      assert.equal(bufferGet.ok?.buffer.group, group)
      assert.ok(message.aggregate.equals(bufferGet.ok?.buffer.aggregate))
      assert.equal(bufferGet.ok?.buffer.pieces.length, totalPieces + 1)

      // prepended piece
      assert.ok(
        bufferGet.ok?.buffer.pieces.find((p) =>
          p.piece.link().equals(bufferedPiece.piece.link())
        )
      )
      assert.ok(
        bufferGet.ok?.buffer.pieces[0].piece
          .link()
          .equals(bufferedPiece.piece.link())
      )
    },
  'handles buffer queue messages successfully to queue aggregate and remaining buffer':
    async (assert, context) => {
      const group = context.id.did()
      const { buffers, blocks } = await getBuffers(2, group, {
        length: 10,
        size: 1024,
      })
      const totalPieces = buffers.reduce((acc, v) => {
        acc += v.pieces.length
        return acc
      }, 0)

      // Store buffers
      for (let i = 0; i < blocks.length; i++) {
        const putBufferRes = await context.bufferStore.put({
          buffer: buffers[i],
          block: blocks[i].cid,
        })
        assert.ok(putBufferRes.ok)
      }

      // Handle messages
      const handledMessageRes = await AggregatorEvents.handleBufferQueueMessage(
        {
          ...context,
          config: {
            minAggregateSize: 2 ** 13,
            minUtilizationFactor: 10,
            maxAggregateSize: 2 ** 15,
          },
        },
        blocks.map((b) => ({
          pieces: b.cid,
          group,
        }))
      )
      assert.ok(handledMessageRes.ok)

      // Validate queue and store
      await pWaitFor(
        () =>
          context.queuedMessages.get('bufferQueue')?.length === 1 &&
          context.queuedMessages.get('aggregateOfferQueue')?.length === 1
      )
      /** @type {AggregateOfferMessage} */
      // @ts-expect-error cannot infer buffer message
      const aggregateOfferMessage = context.queuedMessages.get(
        'aggregateOfferQueue'
      )?.[0]
      /** @type {BufferMessage} */
      // @ts-expect-error cannot infer buffer message
      const bufferMessage = context.queuedMessages.get('bufferQueue')?.[0]

      const aggregateBufferGet = await context.bufferStore.get(
        aggregateOfferMessage.buffer
      )
      assert.ok(aggregateBufferGet.ok)
      const remainingBufferGet = await context.bufferStore.get(
        bufferMessage.pieces
      )
      assert.ok(remainingBufferGet.ok)

      assert.equal(
        aggregateBufferGet.ok?.buffer.pieces.length,
        handledMessageRes.ok?.aggregatedPieces
      )
      assert.equal(
        (aggregateBufferGet.ok?.buffer.pieces.length || 0) +
          (remainingBufferGet.ok?.buffer.pieces.length || 0),
        totalPieces
      )
    },
  'handles buffer queue message errors when fails to access buffer store':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { blocks } = await getBuffers(2, group)

        // Handle messages
        const handledMessageRes =
          await AggregatorEvents.handleBufferQueueMessage(
            context,
            blocks.map((b) => ({
              pieces: b.cid,
              group,
            }))
          )
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        bufferStore:
          getStoreImplementations(FailingStore).aggregator.bufferStore,
      })
    ),
  'handles buffer queue message errors when fails to put message in buffer queue':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { buffers, blocks } = await getBuffers(2, group)

        // Store buffers
        for (let i = 0; i < blocks.length; i++) {
          const putBufferRes = await context.bufferStore.put({
            buffer: buffers[i],
            block: blocks[i].cid,
          })
          assert.ok(putBufferRes.ok)
        }

        // Handle messages
        const handledMessageRes =
          await AggregatorEvents.handleBufferQueueMessage(
            {
              ...context,
              config: {
                minAggregateSize: 2 ** 34,
                minUtilizationFactor: 4,
                maxAggregateSize: 2 ** 35,
              },
            },
            blocks.map((b) => ({
              pieces: b.cid,
              group,
            }))
          )
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, QueueOperationErrorName)
      },
      async (context) => ({
        ...context,
        bufferQueue: new FailingQueue(),
      })
    ),
  'handles buffer queue message errors when fails to put message in aggregate queue':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { buffers, blocks } = await getBuffers(2, group, {
          length: 100,
          size: 128,
        })

        // Store buffers
        for (let i = 0; i < blocks.length; i++) {
          const putBufferRes = await context.bufferStore.put({
            buffer: buffers[i],
            block: blocks[i].cid,
          })
          assert.ok(putBufferRes.ok)
        }

        // Handle messages
        const handledMessageRes =
          await AggregatorEvents.handleBufferQueueMessage(
            {
              ...context,
              config: {
                minAggregateSize: 2 ** 19,
                minUtilizationFactor: 10e5,
                maxAggregateSize: 2 ** 35,
              },
            },
            blocks.map((b) => ({
              pieces: b.cid,
              group,
            }))
          )
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, QueueOperationErrorName)
      },
      async (context) => ({
        ...context,
        aggregateOfferQueue: new FailingQueue(),
      })
    ),
  'handles aggregate offer queue messages successfully': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(100, 128)

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
    const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

    /** @type {AggregateOfferMessage} */
    const message = {
      aggregate: aggregate.link,
      pieces: piecesBlock.cid,
      buffer: block.cid,
      group,
      minPieceInsertedAt: new Date().toISOString(),
    }

    // Handle message
    const handledMessageRes =
      await AggregatorEvents.handleAggregateOfferMessage(context, message)
    assert.ok(handledMessageRes.ok)

    // Verify store
    const hasStoredAggregate = await context.aggregateStore.get({
      aggregate: message.aggregate,
    })
    assert.ok(hasStoredAggregate.ok)
    assert.ok(hasStoredAggregate.ok?.aggregate.equals(aggregate.link))
    assert.ok(hasStoredAggregate.ok?.buffer.equals(block.cid))
    assert.ok(hasStoredAggregate.ok?.pieces.equals(piecesBlock.cid))
    assert.equal(hasStoredAggregate.ok?.group, group)
    assert.ok(hasStoredAggregate.ok?.insertedAt)
  },
  'handles aggregate offer queue message errors when fails to store into aggregate store':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(100, 128)

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
        const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

        /** @type {AggregateOfferMessage} */
        const message = {
          aggregate: aggregate.link,
          buffer: block.cid,
          pieces: piecesBlock.cid,
          group,
          minPieceInsertedAt: new Date().toISOString(),
        }

        // Handle message
        const handledMessageRes =
          await AggregatorEvents.handleAggregateOfferMessage(context, message)
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        aggregateStore:
          getStoreImplementations(FailingStore).aggregator.aggregateStore,
      })
    ),
  'handles aggregate insert to queue piece accept successfully': async (
    assert,
    context
  ) => {
    const piecesLength = 100
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(piecesLength, 128)

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
    const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

    // Put buffer record
    const putBufferRes = await context.bufferStore.put({
      buffer,
      block: block.cid,
    })
    assert.ok(putBufferRes.ok)

    // Put aggregate record
    const aggregateRecord = {
      buffer: block.cid,
      pieces: piecesBlock.cid,
      aggregate: aggregate.link,
      group,
      insertedAt: new Date().toISOString(),
      minPieceInsertedAt: new Date().toISOString(),
    }
    const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
    assert.ok(putAggregateRes.ok)

    // Handle event
    const handledAggregateInsertsRes =
      await AggregatorEvents.handleAggregateInsertToPieceAcceptQueue(
        context,
        aggregateRecord
      )
    assert.ok(handledAggregateInsertsRes.ok)

    // Validate queue and store
    await pWaitFor(
      () =>
        context.queuedMessages.get('pieceAcceptQueue')?.length === piecesLength
    )
    // Validate one message
    /** @type {PieceAcceptMessage} */
    // @ts-expect-error cannot infer buffer message
    const message = context.queuedMessages.get('pieceAcceptQueue')?.[0]
    assert.ok(message.aggregate.equals(aggregate.link))
    assert.ok(pieces.find((p) => p.link.equals(message.piece)))

    // Verify inclusion proof
    const inclusionProof = aggregate.resolveProof(message.piece)
    if (!inclusionProof.ok) {
      throw new Error()
    }
    assert.deepEqual(
      BigInt(message.inclusion.subtree[0]),
      inclusionProof.ok?.[0][0]
    )
    assert.deepEqual(
      BigInt(message.inclusion.index[0]),
      inclusionProof.ok?.[1][0]
    )

    assert.deepEqual(message.inclusion.subtree[1], inclusionProof.ok?.[0][1])
    assert.deepEqual(message.inclusion.index[1], inclusionProof.ok?.[1][1])
  },
  'handles aggregate insert event to piece accept queue errors when fails to read from buffer store':
    wichMockableContext(
      async (assert, context) => {
        const piecesLength = 100
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(piecesLength, 128)

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
        const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

        // Put aggregate record
        const aggregateRecord = {
          buffer: block.cid,
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          group,
          insertedAt: new Date().toISOString(),
          minPieceInsertedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledAggregateInsertsRes =
          await AggregatorEvents.handleAggregateInsertToPieceAcceptQueue(
            context,
            aggregateRecord
          )
        assert.ok(handledAggregateInsertsRes.error)
        assert.equal(
          handledAggregateInsertsRes.error?.name,
          StoreOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        bufferStore:
          getStoreImplementations(FailingStore).aggregator.bufferStore,
      })
    ),
  'handles aggregate insert event to piece accept queue errors when fails to add to piece accept queue':
    wichMockableContext(
      async (assert, context) => {
        const piecesLength = 100
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(piecesLength, 128)

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
        const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

        // Put buffer record
        const putBufferRes = await context.bufferStore.put({
          buffer,
          block: block.cid,
        })
        assert.ok(putBufferRes.ok)

        // Put aggregate record
        const aggregateRecord = {
          buffer: block.cid,
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          group,
          insertedAt: new Date().toISOString(),
          minPieceInsertedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledAggregateInsertsRes =
          await AggregatorEvents.handleAggregateInsertToPieceAcceptQueue(
            context,
            aggregateRecord
          )
        assert.ok(handledAggregateInsertsRes.error)
        assert.equal(
          handledAggregateInsertsRes.error?.name,
          QueueOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        pieceAcceptQueue: new FailingQueue(),
      })
    ),
  'handles piece accept queue messages successfully': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(100, 128)
    const piece = pieces[0].link

    // Create inclusion proof
    const inclusionProof = aggregate.resolveProof(piece)
    if (!inclusionProof.ok) {
      throw new Error()
    }

    /** @type {PieceAcceptMessage} */
    const message = {
      aggregate: aggregate.link,
      piece,
      group,
      inclusion: {
        subtree: inclusionProof.ok[0],
        index: inclusionProof.ok[1],
      },
    }

    // Handle message
    const handledMessageRes = await AggregatorEvents.handlePieceAcceptMessage(
      context,
      message
    )
    assert.ok(handledMessageRes.ok)

    // Verify store
    const hasStoredInclusion = await context.inclusionStore.get({
      piece,
      aggregate: message.aggregate,
    })
    assert.ok(hasStoredInclusion.ok)
    assert.ok(hasStoredInclusion.ok?.aggregate.equals(aggregate.link))
    assert.ok(hasStoredInclusion.ok?.piece.equals(piece))
    assert.equal(hasStoredInclusion.ok?.group, group)
    assert.ok(hasStoredInclusion.ok?.insertedAt)
    assert.deepEqual(
      BigInt(message.inclusion.subtree[0]),
      // @ts-ignore
      BigInt(hasStoredInclusion.ok?.inclusion.subtree[0])
    )
    assert.deepEqual(
      BigInt(message.inclusion.index[0]),
      // @ts-ignore
      BigInt(hasStoredInclusion.ok?.inclusion.index[0])
    )
    assert.deepEqual(
      message.inclusion.subtree[1],
      // @ts-ignore
      hasStoredInclusion.ok?.inclusion.subtree[1]
    )
    assert.deepEqual(
      message.inclusion.index[1],
      // @ts-ignore
      hasStoredInclusion.ok?.inclusion.index[1]
    )
  },
  'handles piece accept message errors when fails to store on inclusion store':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(100, 128)
        const piece = pieces[0].link

        // Create inclusion proof
        const inclusionProof = aggregate.resolveProof(piece)
        if (!inclusionProof.ok) {
          throw new Error()
        }

        /** @type {PieceAcceptMessage} */
        const message = {
          aggregate: aggregate.link,
          piece,
          group,
          inclusion: {
            subtree: inclusionProof.ok[0],
            index: inclusionProof.ok[1],
          },
        }

        // Handle message
        const handledMessageRes =
          await AggregatorEvents.handlePieceAcceptMessage(context, message)
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        inclusionStore:
          getStoreImplementations(FailingStore).aggregator.inclusionStore,
      })
    ),
  'handles inclusion insert to update piece store entry successfully': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(100, 128)
    const piece = pieces[0].link

    // Store piece
    const piecePut = await context.pieceStore.put({
      piece,
      group,
      status: 'offered',
      insertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    assert.ok(piecePut.ok)

    // Create inclusion proof
    const inclusionProof = aggregate.resolveProof(piece)
    if (!inclusionProof.ok) {
      throw new Error()
    }

    // Insert inclusion
    const inclusionRecord = {
      aggregate: aggregate.link,
      piece,
      group,
      inclusion: {
        subtree: inclusionProof.ok[0],
        index: inclusionProof.ok[1],
      },
      insertedAt: new Date().toISOString(),
    }
    const inclusionPut = await context.inclusionStore.put(inclusionRecord)
    assert.ok(inclusionPut.ok)

    // Handle insert event
    const handledMessageRes =
      await AggregatorEvents.handleInclusionInsertToUpdateState(
        context,
        inclusionRecord
      )
    assert.ok(handledMessageRes.ok)

    // Verify store
    const pieceGet = await context.pieceStore.get({
      piece,
      group,
    })
    assert.ok(pieceGet.ok)
    assert.equal(pieceGet.ok?.status, 'accepted')
    assert.ok(pieceGet.ok?.insertedAt)
    assert.ok(pieceGet.ok?.updatedAt)
  },
  'handles inclusion insert event errors when fails to update piece store entry':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(100, 128)
        const piece = pieces[0].link

        // Create inclusion proof
        const inclusionProof = aggregate.resolveProof(piece)
        if (!inclusionProof.ok) {
          throw new Error()
        }

        // Insert inclusion
        const inclusionRecord = {
          aggregate: aggregate.link,
          piece,
          group,
          inclusion: {
            subtree: inclusionProof.ok[0],
            index: inclusionProof.ok[1],
          },
          insertedAt: new Date().toISOString(),
        }
        const inclusionPut = await context.inclusionStore.put(inclusionRecord)
        assert.ok(inclusionPut.ok)

        // Handle insert event
        const handledMessageRes =
          await AggregatorEvents.handleInclusionInsertToUpdateState(
            context,
            inclusionRecord
          )
        assert.ok(handledMessageRes.error)
        assert.equal(handledMessageRes.error?.name, StoreOperationErrorName)
      },
      async (context) => ({
        ...context,
        pieceStore: getStoreImplementations(FailingStore).aggregator.pieceStore,
      })
    ),
  'handles inclusion insert to issue piece accept receipt successfully': async (
    assert,
    context
  ) => {
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(100, 128)
    const piece = pieces[0].link

    // Create inclusion proof
    const inclusionProof = aggregate.resolveProof(piece)
    if (!inclusionProof.ok) {
      throw new Error()
    }

    // Insert inclusion
    const inclusionRecord = {
      aggregate: aggregate.link,
      piece,
      group,
      inclusion: {
        subtree: inclusionProof.ok[0],
        index: inclusionProof.ok[1],
      },
      insertedAt: new Date().toISOString(),
    }
    const inclusionPut = await context.inclusionStore.put(inclusionRecord)
    assert.ok(inclusionPut.ok)

    // Handle insert event
    const handledMessageRes =
      await AggregatorEvents.handleInclusionInsertToIssuePieceAccept(
        context,
        inclusionRecord
      )
    assert.ok(handledMessageRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.piece?.accept?.callCount, 1)
    assert.ok(
      inclusionRecord.piece.equals(
        // @ts-expect-error not typed hooks
        context.service.piece?.accept?._params[0].nb.piece
      )
    )
    assert.equal(
      inclusionRecord.group,
      // @ts-expect-error not typed hooks
      context.service.piece?.accept?._params[0].nb.group
    )
  },
  'handles inclusion insert failures to invoke piece accept':
    wichMockableContext(
      async (assert, context) => {
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(100, 128)
        const piece = pieces[0].link

        // Create inclusion proof
        const inclusionProof = aggregate.resolveProof(piece)
        if (!inclusionProof.ok) {
          throw new Error()
        }

        // Insert inclusion
        const inclusionRecord = {
          aggregate: aggregate.link,
          piece,
          group,
          inclusion: {
            subtree: inclusionProof.ok[0],
            index: inclusionProof.ok[1],
          },
          insertedAt: new Date().toISOString(),
        }
        const inclusionPut = await context.inclusionStore.put(inclusionRecord)
        assert.ok(inclusionPut.ok)

        // Handle message
        const handledMessageRes =
          await AggregatorEvents.handleInclusionInsertToIssuePieceAccept(
            context,
            inclusionRecord
          )
        assert.ok(handledMessageRes.error)
      },
      async (context) => {
        /**
         * Mock aggregator to fail
         */
        const service = mockService({
          piece: {
            accept: Server.provideAdvanced({
              capability: AggregatorCaps.pieceAccept,
              handler: async ({ invocation, context }) => {
                return {
                  error: new Server.Failure(),
                }
              },
            }),
          },
        })
        const aggregatorConnection = getConnection(
          context.id,
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
              audience: context.id,
            },
          },
        }
      }
    ),
  'handles aggregate insert to invoke aggregate offer successfully': async (
    assert,
    context
  ) => {
    const piecesLength = 100
    const group = context.id.did()
    const { aggregate, pieces } = await randomAggregate(piecesLength, 128)

    /** @type {Buffer} */
    const buffer = {
      pieces: pieces.map((p) => ({
        piece: p.link,
        insertedAt: new Date().toISOString(),
        policy: 0,
      })),
      group,
    }
    const blockBuffer = await CBOR.write(buffer)
    const blockPieces = await CBOR.write(pieces.map((p) => p.link))

    // Put buffer record
    const putBufferRes = await context.bufferStore.put({
      buffer,
      block: blockBuffer.cid,
    })
    assert.ok(putBufferRes.ok)

    // Put aggregate record
    const aggregateRecord = {
      buffer: blockBuffer.cid,
      aggregate: aggregate.link,
      pieces: blockPieces.cid,
      group,
      insertedAt: new Date().toISOString(),
      minPieceInsertedAt: new Date().toISOString(),
    }
    const putAggregateRes = await context.aggregateStore.put(aggregateRecord)
    assert.ok(putAggregateRes.ok)

    // Handle event
    const handledAggregateInsertsRes =
      await AggregatorEvents.handleAggregateInsertToAggregateOffer(
        context,
        aggregateRecord
      )
    assert.ok(handledAggregateInsertsRes.ok)

    // Verify invocation
    // @ts-expect-error not typed hooks
    assert.equal(context.service.aggregate?.offer?.callCount, 1)
    assert.ok(
      blockPieces.cid.equals(
        // @ts-expect-error not typed hooks
        context.service.aggregate?.offer?._params[0].nb.pieces
      )
    )
    assert.ok(
      aggregateRecord.aggregate.equals(
        // @ts-expect-error not typed hooks
        context.service.aggregate?.offer?._params[0].nb.aggregate
      )
    )
  },
  'handles aggregate insert event errors when fails to read from buffer store':
    wichMockableContext(
      async (assert, context) => {
        const piecesLength = 100
        const group = context.id.did()
        const { aggregate, pieces } = await randomAggregate(piecesLength, 128)

        /** @type {Buffer} */
        const buffer = {
          pieces: pieces.map((p) => ({
            piece: p.link,
            insertedAt: new Date().toISOString(),
            policy: 0,
          })),
          group,
        }
        const blockBuffer = await CBOR.write(buffer)
        const piecesBlock = await CBOR.write(pieces.map((p) => p.link))

        // Put aggregate record
        const aggregateRecord = {
          buffer: blockBuffer.cid,
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          group,
          insertedAt: new Date().toISOString(),
          minPieceInsertedAt: new Date().toISOString(),
        }
        const putAggregateRes = await context.aggregateStore.put(
          aggregateRecord
        )
        assert.ok(putAggregateRes.ok)

        // Handle event
        const handledAggregateInsertsRes =
          await AggregatorEvents.handleAggregateInsertToAggregateOffer(
            context,
            aggregateRecord
          )
        assert.ok(handledAggregateInsertsRes.error)
        assert.equal(
          handledAggregateInsertsRes.error?.name,
          StoreOperationErrorName
        )
      },
      async (context) => ({
        ...context,
        bufferStore:
          getStoreImplementations(FailingStore).aggregator.bufferStore,
      })
    ),
}

/**
 * @param {number} length
 * @param {string} group
 * @param {object} [piecesOptions]
 * @param {number} [piecesOptions.length]
 * @param {number} [piecesOptions.size]
 */
async function getBuffers(length, group, piecesOptions = {}) {
  const piecesLength = piecesOptions.length || 100
  const piecesSize = piecesOptions.size || 128

  const pieceBatches = await Promise.all(
    Array.from({ length }).map(() => randomCargo(piecesLength, piecesSize))
  )

  const buffers = pieceBatches.map((b) => ({
    pieces: b.map((p) => ({
      piece: p.link,
      insertedAt: new Date().toISOString(),
      policy: /** @type {PiecePolicy} */ (0),
    })),
    group,
  }))

  return {
    buffers,
    blocks: await Promise.all(buffers.map((b) => CBOR.write(b))),
  }
}

/**
 * @param {API.Test<TestAPI.AggregatorTestEventsContext>} testFn
 * @param {(context: TestAPI.AggregatorTestEventsContext) => Promise<TestAPI.AggregatorTestEventsContext>} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return async function (...args) {
    const modifiedArgs = [args[0], await mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}
