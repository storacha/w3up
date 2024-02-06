import type { Signer, Principal, Link } from '@ucanto/interface'
import { InclusionProof } from '@web3-storage/capabilities/types'
import { PieceLink } from '@web3-storage/data-segment'
import {
  AggregatorService,
  DealerService,
} from '@web3-storage/filecoin-client/types'
import {
  Store,
  UpdatableStore,
  QueryableStore,
  Queue,
  ServiceConfig,
} from '../types.js'

export type PieceStore = UpdatableStore<PieceRecordKey, PieceRecord>
export type PieceQueue = Queue<PieceMessage>
export type BufferQueue = Queue<BufferMessage>
export type BufferStore = Store<Link, BufferRecord>
export type AggregateStore = Store<AggregateRecordKey, AggregateRecord>
export type PieceAcceptQueue = Queue<PieceAcceptMessage>
export type InclusionStore = QueryableStore<
  InclusionRecordKey,
  InclusionRecord,
  InclusionRecordQueryByGroup
>
export type AggregateOfferQueue = Queue<AggregateOfferMessage>

export interface ServiceContext {
  /**
   * Service signer
   */
  id: Signer
  /**
   * Principal for dealer service
   */
  dealerId: Principal
  /**
   * Stores pieces that have been offered to the aggregator.
   */
  pieceStore: PieceStore
  /**
   * Queues pieces being buffered into an aggregate.
   */
  pieceQueue: PieceQueue
  /**
   * Stores fully buffered aggregates.
   */
  aggregateStore: AggregateStore
  /**
   * Stores inclusion proofs for pieces included in an aggregate.
   */
  inclusionStore: InclusionStore
}

export interface PieceMessageContext
  extends Pick<ServiceContext, 'pieceStore'> {}

export interface PieceAcceptMessageContext
  extends Pick<ServiceContext, 'inclusionStore'> {}

export interface AggregateOfferMessageContext
  extends Pick<ServiceContext, 'aggregateStore'> {}

export interface PieceInsertEventContext {
  /**
   * Queues pieces being buffered into an aggregate.
   */
  bufferQueue: BufferQueue
  /**
   * Store of CID => Buffer Record
   */
  bufferStore: BufferStore
}

export interface InclusionInsertEventToUpdateState
  extends Pick<ServiceContext, 'pieceStore'> {}

export interface InclusionInsertEventToIssuePieceAccept {
  /**
   * Aggregator connection to moves pieces into the pipeline.
   */
  aggregatorService: ServiceConfig<AggregatorService>
}

export interface AggregateInsertEventToPieceAcceptQueueContext {
  /**
   * Store of CID => Buffer Record
   */
  bufferStore: BufferStore
  /**
   * Queues pieces, their aggregate and their inclusion proofs.
   */
  pieceAcceptQueue: PieceAcceptQueue
  /**
   * Buffer configuration for aggregation.
   */
  config: AggregateConfig
}

export interface AggregateInsertEventToAggregateOfferContext {
  /**
   * Store of CID => Buffer Record
   */
  bufferStore: BufferStore
  /**
   * Dealer connection to moves pieces into the pipeline.
   */
  dealerService: ServiceConfig<DealerService>
}

export interface BufferMessageContext {
  /**
   * Queues pieces being buffered into an aggregate.
   */
  bufferQueue: BufferQueue
  /**
   * Store of CID => Buffer Record
   */
  bufferStore: BufferStore
  /**
   * Queues buffered aggregates to be offered to the Dealer.
   */
  aggregateOfferQueue: AggregateOfferQueue
  /**
   * Buffer configuration for aggregation.
   */
  config: AggregateConfig
}

export interface PieceRecord {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Status of the offered piece.
   * - offered = acknowledged received for aggregation.
   * - accepted = accepted into an aggregate and offered for inclusion in filecoin deal(s).
   */
  status: 'offered' | 'accepted'
  /**
   * Insertion date ISO string.
   */
  insertedAt: string
  /**
   * Update date ISO string.
   */
  updatedAt: string
}

export interface PieceRecordKey extends Pick<PieceRecord, 'piece' | 'group'> {}

export interface PieceMessage {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
}

export interface AggregateRecord {
  /**
   * `bagy...aggregate` Piece CID of an aggregate
   */
  aggregate: PieceLink
  /**
   * `bafy...cbor` as CID of dag-cbor block with buffer of pieces in an aggregate.
   */
  buffer: Link
  /**
   * `bafy...cbor` as CID of dag-cbor block with list of pieces in an aggregate.
   */
  pieces: Link
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Insertion date ISO string.
   */
  insertedAt: string
  /**
   * ISO string date of oldest piece in the pipeline included into the aggregate.
   */
  minPieceInsertedAt: string
}

// TODO: probably group should also be key!
export interface AggregateRecordKey
  extends Pick<AggregateRecord, 'aggregate'> {}

export interface InclusionRecord {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Proof that the piece is included in the aggregate.
   */
  inclusion: InclusionProof
  /**
   * Insertion date ISO string.
   */
  insertedAt: string
}

export interface InclusionRecordKey
  extends Pick<InclusionRecord, 'piece' | 'aggregate'> {}

export interface InclusionRecordQueryByGroup
  extends Pick<InclusionRecord, 'piece' | 'group'> {}

export type BufferedPiece = {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * Policies that this piece is under
   */
  policy: PiecePolicy
  /**
   * Insertion date ISO string.
   */
  insertedAt: string
}

export interface Buffer {
  /**
   * `bagy...aggregate` Piece CID of an aggregate
   */
  aggregate?: PieceLink
  /**
   * Pieces inside the buffer record.
   */
  pieces: BufferedPiece[]
  /**
   * Grouping information for submitted buffer.
   */
  group: string
}

export interface BufferRecord {
  /**
   * Buffer with a set of Filecoin pieces pending aggregation.
   */
  buffer: Buffer
  /**
   * `bafy...cbor` as CID of dag-cbor block with list of pieces in an aggregate.
   */
  block: Link
}

export interface BufferMessage {
  /**
   * `bagy...aggregate` Piece CID of an aggregate
   */
  aggregate?: PieceLink
  /**
   * `bafy...cbor` as CID of dag-cbor block with Buffer
   */
  pieces: Link
  /**
   * Grouping information for submitted buffer.
   */
  group: string
}

export interface PieceAcceptMessage {
  /**
   * Piece CID.
   */
  piece: PieceLink
  /**
   * Piece CID of an aggregate
   */
  aggregate: PieceLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Proof that the piece is included in the aggregate.
   */
  inclusion: InclusionProof
}

export interface AggregateOfferMessage {
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * List of pieces in an aggregate.
   */
  pieces: Link
  /**
   * `bafy...cbor` as CID of dag-cbor block with buffer of pieces in an aggregate.
   */
  buffer: Link
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * ISO string date of oldest piece in the pipeline included into the aggregate.
   */
  minPieceInsertedAt: string
}

export interface AggregateConfig {
  maxAggregateSize: number
  minAggregateSize: number
  minUtilizationFactor: number
  prependBufferedPieces?: BufferedPiece[]
}

// Enums
export type PiecePolicy = NORMAL | RETRY

type NORMAL = 0
type RETRY = 1
