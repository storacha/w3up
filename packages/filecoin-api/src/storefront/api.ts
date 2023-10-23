import type {
  Signer,
  Principal,
  UnknownLink,
  Receipt,
  Invocation,
  Failure,
} from '@ucanto/interface'
import { PieceLink } from '@web3-storage/data-segment'
import { AggregatorService, StorefrontService } from '@web3-storage/filecoin-client/types'
import { Store, UpdatableAndQueryableStore, Queue, ServiceConfig } from '../types.js'

export interface Config {
  /**
   * Implementer MAY handle submission without user request.
   */
  skipFilecoinSubmitQueue?: boolean
}

export interface ServiceContext {
  /**
   * Service signer
   */
  id: Signer
  /**
   * Principal for aggregator service
   */
  aggregatorId: Principal
  /**
   * Stores pieces that have been offered to the Storefront.
   */
  pieceStore: UpdatableAndQueryableStore<
    PieceRecordKey,
    PieceRecord,
    Pick<PieceRecord, 'status'>
  >
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
  taskStore: Store<UnknownLink, Invocation>
  /**
   * Stores receipts for tasks.
   */
  receiptStore: Store<UnknownLink, Receipt>
  /**
   * Service config.
   */
  config?: Config
}

export interface FilecoinSubmitMessageContext
  extends Pick<ServiceContext, 'pieceStore'> {}

export interface PieceOfferMessageContext {
  /**
   * Aggregator connection to moves pieces into the pipeline.
   */
  aggregatorService: ServiceConfig<AggregatorService>
}

export interface StorefrontClientContext {
  /**
   * Storefront own connection to issue receipts.
   */
  storefrontService: ServiceConfig<StorefrontService>
}

export interface CronContext
  extends Pick<
    ServiceContext,
    'id' | 'pieceStore' | 'receiptStore' | 'taskStore'
  > {
  /**
   * Principal for aggregator service
   */
  aggregatorId: Signer
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
   * - submitted = verified valid piece and submitted to the aggregation pipeline
   * - accepted = accepted and included in filecoin deal(s)
   * - invalid = content/piece CID mismatch
   */
  status: 'submitted' | 'accepted' | 'invalid'
  /**
   * Insertion date in milliseconds since unix epoch.
   */
  insertedAt: number
  /**
   * Update date in milliseconds since unix epoch.
   */
  updatedAt: number
}
export interface PieceRecordKey extends Pick<PieceRecord, 'piece'> {}

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

export interface TestEventsContext
  extends FilecoinSubmitMessageContext,
    PieceOfferMessageContext,
    StorefrontClientContext,
    CronContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../types').StorefrontService['filecoin']>
    piece: Partial<import('../types').AggregatorService['piece']>
    aggregate: Partial<import('../../src/types').DealerService['aggregate']>
    deal: Partial<import('../../src/types').DealTrackerService['deal']>
  }>
}
