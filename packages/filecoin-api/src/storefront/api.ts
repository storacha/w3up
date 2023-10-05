import type { Signer, UnknownLink, Receipt, Invocation, Failure } from '@ucanto/interface'
import { PieceLink } from '@web3-storage/data-segment'
import { Store, Queue } from '../types.js'

export interface ServiceContext {
  id: Signer
  /**
   * Stores pieces that have been offered to the Storefront.
   */
  pieceStore: Store<PieceRecord>
  /**
   * Queues pieces for verification.
   */
  filecoinSubmitQueue: Queue<FilecoinSubmitMessage>
  /**
   * Queues pieces for offering to an Aggregator.
   */
  pieceOfferQueue: Queue<PieceOfferMessage>
  /**
   * Stores task invocations.
   */
  taskStore: Store<Invocation>
  /**
   * Stores receipts for tasks.
   */
  receiptStore: Store<Receipt>
}

export interface PieceRecord {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * CAR shard CID.
   */
  content: UnknownLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
  /**
   * Status of the offered filecoin piece.
   * - offered = acknowledged received for inclusion in filecoin deals
   * - submitted = verified valid piece and submitted to the aggregation pipeline
   * - accepted = accepted and included in filecoin deal(s)
   * - invalid = content/piece CID mismatch
   */
  status: 'offered'|'submitted'|'accepted'|'invalid'
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
  /**
   * Update date in milliseconds since unix epoch.
   */
  updatedAt: number
}

export interface FilecoinSubmitMessage {
  /**
   * Piece CID for the content.
   */
  piece: PieceLink
  /**
   * CAR shard CID.
   */
  content: UnknownLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
}

export interface PieceOfferMessage {
  /**
   * Piece CID.
   */
  piece: PieceLink
  /**
   * CAR shard CID.
   */
  content: UnknownLink
  /**
   * Grouping information for submitted piece.
   */
  group: string
}

export interface DataAggregationProofNotFound extends Failure {
  name: 'DataAggregationProofNotFound'
}
