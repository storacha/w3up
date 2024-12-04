import { Aggregator, Dealer } from '@web3-storage/filecoin-client'
import { Aggregate, Piece } from '@web3-storage/data-segment'
import { CBOR } from '@ucanto/core'
import map from 'p-map'

import {
  getBufferedPieces,
  aggregatePieces,
  handleBufferReducingWithoutAggregate,
  handleBufferReducingWithAggregate,
} from './buffer-reducing.js'
import {
  StoreOperationFailed,
  QueueOperationFailed,
  UnexpectedState,
} from '../errors.js'

/**
 * On piece queue messages, store piece.
 *
 * @param {import('./api.js').PieceMessageContext} context
 * @param {import('./api.js').PieceMessage} message
 */
export const handlePieceMessage = async (context, message) => {
  const { piece, group } = message

  // Store piece into the store. Store events MAY be used to propagate piece over
  const putRes = await context.pieceStore.put({
    piece,
    group,
    status: 'offered',
    insertedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  if (putRes.error) {
    return {
      error: new StoreOperationFailed(putRes.error.message),
    }
  }

  return { ok: {} }
}

/**
 * On Piece store insert batch, buffer pieces together to resume buffer processing.
 *
 * @param {import('./api.js').PieceInsertEventContext} context
 * @param {import('./api.js').PieceRecord[]} records
 */
export const handlePiecesInsert = async (context, records) => {
  // TODO: separate buffers per group after MVP
  const { group } = records[0]

  /** @type {import('./api.js').Buffer} */
  const buffer = {
    pieces: records.map((p) => ({
      piece: p.piece,
      insertedAt: p.insertedAt,
      // Set policy as insertion
      policy: /** @type {import('./api.js').PiecePolicy} */ (0),
    })),
    group,
  }
  const block = await CBOR.write(buffer)

  // Store block in buffer store
  const bufferStorePut = await context.bufferStore.put({
    buffer,
    block: block.cid,
  })
  if (bufferStorePut.error) {
    return bufferStorePut
  }

  // Propagate message
  const bufferQueueAdd = await context.bufferQueue.add({
    pieces: block.cid,
    group,
  })
  if (bufferQueueAdd.error) {
    return {
      error: new QueueOperationFailed(bufferQueueAdd.error.message),
    }
  }

  return { ok: {} }
}

/**
 * On buffer queue messages, reduce received buffer records into a bigger buffer.
 * - If new buffer does not have enough load to build an aggregate, it is stored
 *   and requeued for buffer reducing
 * - If new buffer has enough load to build an aggregate, it is stored and queued
 *   into aggregateOfferQueue. Remaining of the new buffer (in case buffer bigger
 *   than maximum aggregate size) is re-queued into the buffer queue.
 *
 * @param {import('./api.js').BufferMessageContext} context
 * @param {import('./api.js').BufferMessage[]} records
 */
export const handleBufferQueueMessage = async (context, records) => {
  // Get reduced buffered pieces
  const buffers = records.map((r) => r.pieces)
  const { error: errorGetBufferedPieces, ok: okGetBufferedPieces } =
    await getBufferedPieces(buffers, context.bufferStore)
  if (errorGetBufferedPieces) {
    return { error: errorGetBufferedPieces }
  }

  const { bufferedPieces, group } = okGetBufferedPieces

  // Attempt to aggregate buffered pieces within the ranges.
  // In case it is possible, included pieces and remaining pieces are returned
  // so that they can be propagated to respective stores/queues.
  const aggregateInfo = aggregatePieces(bufferedPieces, {
    maxAggregateSize: context.config.maxAggregateSize,
    minAggregateSize: context.config.minAggregateSize,
    minUtilizationFactor: context.config.minUtilizationFactor,
    prependBufferedPieces: context.config.prependBufferedPieces,
    hasher: context.config.hasher,
    maxAggregatePieces: context.config.maxAggregatePieces,
  })

  // Store buffered pieces if not enough to do aggregate and re-queue them
  if (!aggregateInfo) {
    const { error: errorHandleBufferReducingWithoutAggregate } =
      await handleBufferReducingWithoutAggregate({
        buffer: {
          pieces: bufferedPieces,
          group,
        },
        bufferStore: context.bufferStore,
        bufferQueue: context.bufferQueue,
      })

    if (errorHandleBufferReducingWithoutAggregate) {
      return { error: errorHandleBufferReducingWithoutAggregate }
    }

    // No pieces were aggregate
    return {
      ok: {
        aggregatedPieces: 0,
      },
    }
  }

  // Store buffered pieces to do aggregate and re-queue remaining ones
  const { error: errorHandleBufferReducingWithAggregate } =
    await handleBufferReducingWithAggregate({
      aggregateInfo,
      bufferStore: context.bufferStore,
      bufferQueue: context.bufferQueue,
      aggregateOfferQueue: context.aggregateOfferQueue,
      group,
    })

  if (errorHandleBufferReducingWithAggregate) {
    return { error: errorHandleBufferReducingWithAggregate }
  }

  return {
    ok: {
      aggregatedPieces: aggregateInfo.addedBufferedPieces.length,
    },
  }
}

/**
 * On aggregate offer queue message, store aggregate record in store.
 *
 * @param {import('./api.js').AggregateOfferMessageContext} context
 * @param {import('./api.js').AggregateOfferMessage} message
 */
export const handleAggregateOfferMessage = async (context, message) => {
  const { pieces, aggregate, buffer, group, minPieceInsertedAt } = message

  // Store aggregate information into the store. Store events MAY be used to propagate aggregate over
  const putRes = await context.aggregateStore.put({
    pieces,
    aggregate,
    buffer,
    group,
    minPieceInsertedAt,
    insertedAt: new Date().toISOString(),
  })

  // TODO: should we ignore error already there?
  if (putRes.error) {
    return putRes
  }

  return { ok: {}, error: undefined }
}

/**
 * On Aggregate store insert, offer inserted aggregate for deal.
 *
 * @param {import('./api.js').AggregateInsertEventToPieceAcceptQueueContext} context
 * @param {import('./api.js').AggregateRecord} record
 */
export const handleAggregateInsertToPieceAcceptQueue = async (
  context,
  record
) => {
  const bufferStoreRes = await context.bufferStore.get(record.buffer)
  if (bufferStoreRes.error) {
    return bufferStoreRes
  }

  // Get pieces from buffer
  const pieces = bufferStoreRes.ok.buffer.pieces.map((p) =>
    Piece.fromLink(p.piece)
  )
  const aggregate = bufferStoreRes.ok.buffer.aggregate

  const aggregateBuilder = Aggregate.build({
    pieces,
    size: Aggregate.Size.from(context.config.maxAggregateSize),
  })

  if (aggregate && !aggregateBuilder.link.equals(aggregate)) {
    return {
      error: new UnexpectedState(
        `invalid aggregate computed for ${bufferStoreRes.ok.block.link}`
      ),
    }
  }

  // TODO: Batch per a maximum to queue
  const results = await map(
    pieces,
    /**
     * @param piece
     * @returns {Promise<import('@ucanto/interface').Result<import('@ucanto/interface').Unit, RangeError|import('../types.js').QueueAddError>>}
     */
    async piece => {
      const inclusionProof = aggregateBuilder.resolveProof(piece.link)
      if (inclusionProof.error) return inclusionProof

      const addMessage = await context.pieceAcceptQueue.add({
        piece: piece.link,
        aggregate: aggregateBuilder.link,
        group: bufferStoreRes.ok.buffer.group,
        inclusion: {
          subtree: inclusionProof.ok[0],
          index: inclusionProof.ok[1],
        },
      })
      if (addMessage.error) return addMessage

      return { ok: {} }
    },
    { concurrency: 10 }
  )
  for (const r of results) {
    if (r.error) return r
  }

  return {
    ok: {},
  }
}

/**
 * On piece accept queue message, store inclusion record in store.
 *
 * @param {import('./api.js').PieceAcceptMessageContext} context
 * @param {import('./api.js').PieceAcceptMessage} message
 */
export const handlePieceAcceptMessage = async (context, message) => {
  const { piece, aggregate, group, inclusion } = message

  // Store inclusion information into the store. Store events MAY be used to propagate inclusion over
  const putRes = await context.inclusionStore.put({
    piece,
    aggregate,
    group,
    inclusion,
    insertedAt: new Date().toISOString(),
  })

  // TODO: should we ignore error already there?
  if (putRes.error) {
    return putRes
  }

  return { ok: {}, error: undefined }
}

/**
 * On Inclusion store insert, piece table can be updated to reflect piece state.
 *
 * @param {import('./api.js').InclusionInsertEventToUpdateState} context
 * @param {Pick<import('./api.js').InclusionRecord, 'piece' | 'group'>} record
 */
export const handleInclusionInsertToUpdateState = async (context, record) => {
  const updateRes = await context.pieceStore.update(
    {
      piece: record.piece,
      group: record.group,
    },
    {
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    }
  )
  if (updateRes.error) {
    return updateRes
  }

  return { ok: {}, error: undefined }
}

/**
 * @param {import('./api.js').InclusionInsertEventToIssuePieceAccept} context
 * @param {Pick<import('./api.js').InclusionRecord, 'piece' | 'group'>} record
 */
export const handleInclusionInsertToIssuePieceAccept = async (
  context,
  record
) => {
  // invoke piece/accept to issue receipt
  const pieceAcceptInv = await Aggregator.pieceAccept(
    context.aggregatorService.invocationConfig,
    record.piece,
    record.group,
    { connection: context.aggregatorService.connection }
  )

  if (pieceAcceptInv.out.error) {
    return {
      error: pieceAcceptInv.out.error,
    }
  }

  return { ok: {} }
}

/**
 * On Aggregate store insert, offer inserted aggregate for deal.
 *
 * @param {import('./api.js').AggregateInsertEventToAggregateOfferContext} context
 * @param {import('./api.js').AggregateRecord} record
 */
export const handleAggregateInsertToAggregateOffer = async (
  context,
  record
) => {
  const bufferStoreRes = await context.bufferStore.get(record.buffer)
  if (bufferStoreRes.error) {
    return {
      error: bufferStoreRes.error,
    }
  }
  // Get pieces from buffer
  const pieces = bufferStoreRes.ok.buffer.pieces.map((p) => p.piece)

  // invoke aggregate/offer
  const aggregateOfferInv = await Dealer.aggregateOffer(
    context.dealerService.invocationConfig,
    record.aggregate,
    pieces,
    { connection: context.dealerService.connection }
  )

  if (aggregateOfferInv.out.error) {
    return {
      error: aggregateOfferInv.out.error,
    }
  }

  return { ok: {} }
}
