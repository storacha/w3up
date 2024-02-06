import { Aggregate, Piece, NODE_SIZE, Index } from '@web3-storage/data-segment'
import { CBOR } from '@ucanto/core'

import { UnexpectedState } from '../errors.js'

/**
 * @typedef {import('@ucanto/interface').Link} Link
 * @typedef {import('@web3-storage/data-segment').AggregateView} AggregateView
 *
 * @typedef {import('./api.js').BufferedPiece} BufferedPiece
 * @typedef {import('./api.js').BufferRecord} BufferRecord
 * @typedef {import('./api.js').BufferMessage} BufferMessage
 * @typedef {import('./api.js').AggregateOfferMessage} AggregateOfferMessage
 * @typedef {import('../types.js').StoreGetError} StoreGetError
 * @typedef {{ bufferedPieces: BufferedPiece[], group: string }} GetBufferedPieces
 * @typedef {import('../types.js').Result<GetBufferedPieces, StoreGetError | UnexpectedState>} GetBufferedPiecesResult
 *
 * @typedef {object} AggregateInfo
 * @property {BufferedPiece[]} addedBufferedPieces
 * @property {BufferedPiece[]} remainingBufferedPieces
 * @property {AggregateView} aggregate
 */

/**
 * @param {object} props
 * @param {AggregateInfo} props.aggregateInfo
 * @param {import('../types.js').Store<Link, BufferRecord>} props.bufferStore
 * @param {import('../types.js').Queue<BufferMessage>} props.bufferQueue
 * @param {import('../types.js').Queue<AggregateOfferMessage>} props.aggregateOfferQueue
 * @param {string} props.group
 */
export async function handleBufferReducingWithAggregate({
  aggregateInfo,
  bufferStore,
  bufferQueue,
  aggregateOfferQueue,
  group,
}) {
  // If aggregate has enough space
  // store buffered pieces that are part of aggregate and queue aggregate
  // store remaining pieces and queue them to be reduced
  /** @type {import('./api.js').Buffer} */
  const aggregateReducedBuffer = {
    aggregate: aggregateInfo.aggregate.link,
    pieces: aggregateInfo.addedBufferedPieces,
    group,
  }
  const piecesBlock = await CBOR.write(
    aggregateInfo.addedBufferedPieces.map((bf) => bf.piece)
  )
  const aggregateBlock = await CBOR.write(aggregateReducedBuffer)

  // Get timestamp of oldest piece in the pipeline included in the aggregate
  const minPieceInsertedAtDate = new Date(
    Math.min(
      ...aggregateInfo.addedBufferedPieces.map((bf) =>
        new Date(bf.insertedAt).getTime()
      )
    )
  )

  // Store buffered pieces for aggregate
  const bufferStoreAggregatePut = await bufferStore.put({
    buffer: aggregateReducedBuffer,
    block: aggregateBlock.cid,
  })
  if (bufferStoreAggregatePut.error) {
    return bufferStoreAggregatePut
  }

  // Propagate message for aggregate offer queue
  const aggregateOfferQueueAdd = await aggregateOfferQueue.add({
    aggregate: aggregateInfo.aggregate.link,
    buffer: aggregateBlock.cid,
    pieces: piecesBlock.cid,
    group,
    minPieceInsertedAt: minPieceInsertedAtDate.toISOString(),
  })
  if (aggregateOfferQueueAdd.error) {
    return aggregateOfferQueueAdd
  }

  // Store remaining buffered pieces to reduce if they exist
  if (!aggregateInfo.remainingBufferedPieces.length) {
    return { ok: {} }
  }

  const remainingReducedBuffer = {
    pieces: aggregateInfo.remainingBufferedPieces,
    group: group,
  }
  const remainingBlock = await CBOR.write(remainingReducedBuffer)

  // Store remaining buffered pieces
  const bufferStoreRemainingPut = await bufferStore.put({
    buffer: remainingReducedBuffer,
    block: remainingBlock.cid,
  })
  if (bufferStoreRemainingPut.error) {
    return bufferStoreRemainingPut
  }

  // Propagate message for buffer queue
  const bufferQueueAdd = await bufferQueue.add({
    pieces: remainingBlock.cid,
    group: group,
  })
  if (bufferQueueAdd.error) {
    return bufferQueueAdd
  }

  return { ok: {}, error: undefined }
}

/**
 * Store given buffer into store and queue it to further reducing.
 *
 * @param {object} props
 * @param {import('./api.js').Buffer} props.buffer
 * @param {import('../types.js').Store<Link, BufferRecord>} props.bufferStore
 * @param {import('../types.js').Queue<BufferMessage>} props.bufferQueue
 */
export async function handleBufferReducingWithoutAggregate({
  buffer,
  bufferStore,
  bufferQueue,
}) {
  const block = await CBOR.write(buffer)

  // Store block in buffer store
  const bufferStorePut = await bufferStore.put({
    buffer,
    block: block.cid,
  })
  if (bufferStorePut.error) {
    return bufferStorePut
  }

  // Propagate message
  const bufferQueueAdd = await bufferQueue.add({
    pieces: block.cid,
    group: buffer.group,
  })
  if (bufferQueueAdd.error) {
    return bufferQueueAdd
  }

  return { ok: {}, error: undefined }
}

/**
 * Attempt to build an aggregate with buffered pieces within ranges.
 *
 * @param {BufferedPiece[]} bufferedPieces
 * @param {object} config
 * @param {number} config.maxAggregateSize
 * @param {number} config.minAggregateSize
 * @param {number} config.minUtilizationFactor
 * @param {BufferedPiece[]} [config.prependBufferedPieces]
 */
export function aggregatePieces(bufferedPieces, config) {
  // Guarantee buffered pieces total size is bigger than the minimum utilization
  const bufferUtilizationSize = bufferedPieces.reduce((total, p) => {
    const piece = Piece.fromLink(p.piece)
    total += piece.size
    return total
  }, 0n)
  if (
    bufferUtilizationSize <
    config.maxAggregateSize / config.minUtilizationFactor
  ) {
    return
  }

  // Create builder with maximum size and try to fill it up
  const builder = Aggregate.createBuilder({
    size: Aggregate.Size.from(config.maxAggregateSize),
  })

  // add pieces to an aggregate until there is no more space, or no more pieces
  /** @type {BufferedPiece[]} */
  const addedBufferedPieces = []
  /** @type {BufferedPiece[]} */
  const remainingBufferedPieces = []

  // start by adding prepend buffered pieces if available
  for (const bufferedPiece of (config.prependBufferedPieces || [])) {
    const p = Piece.fromLink(bufferedPiece.piece)
    if (builder.estimate(p).error) {
      throw new Error('aggregate builder is not able to create aggregates with only prepend buffered pieces')
    }
    builder.write(p)
    addedBufferedPieces.push(bufferedPiece)
  }

  for (const bufferedPiece of bufferedPieces) {
    const p = Piece.fromLink(bufferedPiece.piece)
    if (builder.estimate(p).error) {
      remainingBufferedPieces.push(bufferedPiece)
      continue
    }
    builder.write(p)
    addedBufferedPieces.push(bufferedPiece)
  }
  const totalUsedSpace =
    builder.offset * BigInt(NODE_SIZE) +
    BigInt(builder.limit) * BigInt(Index.EntrySize)

  // If not enough space return undefined
  if (totalUsedSpace < BigInt(config.minAggregateSize)) {
    return
  }

  const aggregate = builder.build()

  return {
    addedBufferedPieces,
    remainingBufferedPieces,
    aggregate,
  }
}

/**
 * Get buffered pieces from queue buffer records.
 *
 * @param {Link[]} bufferPieces
 * @param {import('../types.js').Store<Link, BufferRecord>} bufferStore
 * @returns {Promise<GetBufferedPiecesResult>}
 */
export async function getBufferedPieces(bufferPieces, bufferStore) {
  if (!bufferPieces.length) {
    return {
      error: new UnexpectedState('received buffer pieces are empty'),
    }
  }

  const getBufferRes = await Promise.all(
    bufferPieces.map((bufferPiece) => bufferStore.get(bufferPiece))
  )

  // Concatenate pieces uniquely and sort them by policy and size
  /** @type {BufferedPiece[]} */
  let bufferedPieces = []
  const uniquePieces = new Set()
  for (const b of getBufferRes) {
    if (b.error) return b
    for (const piece of b.ok.buffer.pieces) {
      const isDuplicate = uniquePieces.has(piece.piece.toString())
      if (!isDuplicate) {
        bufferedPieces.push(piece)
        uniquePieces.add(piece.piece.toString())
      }
    }
  }
  bufferedPieces.sort(sortPieces)

  return {
    ok: {
      bufferedPieces,
      // extract group from one entry
      // TODO: needs to change to support multi group buffering
      // @ts-expect-error typescript does not understand with find that no error and group MUST exist
      group: getBufferRes[0].ok.buffer.group,
    },
  }
}

/**
 * Sort given buffered pieces by policy and then by size.
 *
 * @param {BufferedPiece} a
 * @param {BufferedPiece} b
 */
export function sortPieces(a, b) {
  return a.policy !== b.policy
    ? a.policy - b.policy
    : Piece.fromLink(a.piece).height - Piece.fromLink(b.piece).height
}
