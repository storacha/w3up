import type { Signer, Link, ConnectionView } from '@ucanto/interface'
import { DealMetadata } from '@web3-storage/capabilities/types'
import { PieceLink } from '@web3-storage/data-segment'
import { InvocationConfig } from '@web3-storage/filecoin-client/types'
import { UpdatableStore, UpdatableAndQueryableStore } from '../types.js'

export interface ServiceContext<OfferDoc = OfferDocument> {
  id: Signer
  /**
   * Stores serialized broker specific offer document containing details of the
   * aggregate and it's pieces.
   */
  offerStore: UpdatableStore<string, OfferDoc>
  /**
   * Stores aggregates and their deal proofs.
   */
  aggregateStore: UpdatableAndQueryableStore<
    AggregateRecordKey,
    AggregateRecord,
    Pick<AggregateRecord, 'status'>
  >
}

export interface AggregateInsertEventContext
  extends Pick<ServiceContext, 'offerStore'> {}

export interface AggregateUpdatedStatusEventContext {
  /**
   * Dealer connection to offer aggregates for deals.
   */
  dealerConnection: ConnectionView<any>
  /**
   * Invocation configuration.
   */
  dealerInvocationConfig: InvocationConfig
}

export interface CronContext extends Pick<ServiceContext, 'aggregateStore'> {
  /**
   * Deal tracker connection to find out available deals for an aggregate.
   */
  dealTrackerConnection: ConnectionView<any>
  /**
   * Invocation configuration.
   */
  dealTrackerInvocationConfig: InvocationConfig
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
   * Filecoin deal where aggregate is present.
   */
  deal?: DealMetadata
  /**
   * Status of the offered aggregate piece.
   * - offered = acknowledged received for inclusion in filecoin deals.
   * - accepted = accepted and included a filecoin deal(s).
   * - invalid = not valid for storage.
   */
  status: 'offered' | 'accepted' | 'invalid'
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
  /**
   * Update date in milliseconds since unix epoch.
   */
  updatedAt: number
}

export interface AggregateRecordKey {
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * Filecoin deal where aggregate is present.
   */
  deal?: DealMetadata
}

export interface OfferDocument {
  /**
   * Key of the offer document
   */
  key: string
  /**
   * Value of the offer document
   */
  value: OfferValue
}

export interface OfferValue {
  /**
   * Issuer of the aggregate offer.
   */
  issuer: `did:${string}:${string}`
  /**
   * Piece CID of an aggregate.
   */
  aggregate: PieceLink
  /**
   * Pieces part of the aggregate
   */
  pieces: PieceLink[]
}

export interface TestEventsContext
  extends AggregateInsertEventContext,
    AggregateUpdatedStatusEventContext,
    CronContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../types').StorefrontService['filecoin']>
    piece: Partial<import('../types').AggregatorService['piece']>
    aggregate: Partial<import('../../src/types').DealerService['aggregate']>
    deal: Partial<import('../../src/types').DealTrackerService['deal']>
  }>
}
