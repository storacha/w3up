import type { Signer, Link, ByteView } from '@ucanto/interface'
import { InclusionProof } from '@web3-storage/capabilities/types'
import { PieceLink } from '@web3-storage/data-segment'
import { Store, Queue } from '../types.js'

export interface ServiceContext {
  id: Signer
  /**
   * Stores pieces that have been offered to the aggregator.
   */
  pieceStore: Store<PieceRecord>
  /**
   * Queues pieces being buffered into an aggregate.
   */
  pieceQueue: Queue<PieceMessage>
  /**
   * Queues pieces being buffered into an aggregate.
   */
  bufferQueue: Queue<BufferMessage>
  /**
   * Store of CID => CBOR encoded array of PieceLink
   */
  bufferStore: Store<ByteView<PieceLink[]>>
  /**
   * Stores fully buffered aggregates.
   */
  aggregateStore: Store<AggregateRecord>
  /**
   * Queues pieces, their aggregate and their inclusion proofs.
   */
  pieceAcceptQueue: Queue<PieceAcceptMessage>
  /**
   * Stores inclusion proofs for pieces included in an aggregate.
   */
  inclusionStore: Store<InclusionRecord>
  /**
   * Queues buffered aggregates to be offered to the Dealer.
   */
  aggregateOfferQueue: Queue<AggregateOfferMessage>
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
  status: 'offered'|'accepted'
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
  /**
   * Update date in milliseconds since unix epoch.
   */
  updatedAt: number
}

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
   * List of pieces in an aggregate.
   */
  pieces: Link
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
}

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
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
}

export interface BufferMessage {
  /**
   * `bagy...aggregate` Piece CID of an aggregate
   */
  aggregate: PieceLink
  /**
   * List of pieces in an aggregate.
   */
  pieces: Link
  /**
   * Grouping information for submitted piece.
   */
  group: string
}

export interface PieceAcceptMessage {
  /**
   * Link to the task invocation for `piece/accept`.
   */
  task: Link,
  /**
   * Link to the `aggregate/offer` join task.
   */
  join: Link,
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
   * Link to the task invocation for `aggregate/offer`.
   */
  task: Link,
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * List of pieces in an aggregate.
   */
  pieces: Link
}
