import type { Signer, ByteView, Link } from '@ucanto/interface'
import { DataAggregationProof } from '@web3-storage/capabilities/types'
import { PieceLink } from '@web3-storage/data-segment'
import { Store } from '../types.js'

export interface ServiceContext<OfferDocument = any> {
  id: Signer
  /**
   * Stores serialized broker specific offer document containing details of the
   * aggregate and it's pieces.
   */
  offerStore: Store<ByteView<OfferDocument>>
  /**
   * Stores aggregates and their deal proofs.
   */
  aggregateStore: Store<AggregateRecord>
}

export interface AggregateRecord {
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * List of pieces in an aggregate.
   */
  pieces: Link
  /**
   * Proof that the aggregate is present in a Filecoin deal.
   */
  proof?: DataAggregationProof
  /**
   * Status of the offered aggregate piece.
   * - offered = acknowledged received for inclusion in filecoin deals.
   * - accepted = accepted and included a filecoin deal(s).
   * - invalid = not valid for storage.
   */
  status: 'offered'|'accepted'|'invalid'
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
  /**
   * Update date in milliseconds since unix epoch.
   */
  updatedAt: number
}
