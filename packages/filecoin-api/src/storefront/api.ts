import type {
  Signer,
  Principal,
  UnknownLink,
  Receipt,
  Invocation,
  Failure,
  DID,
  Proof,
  ConnectionView,
} from '@ucanto/interface'
import { PieceLink } from '@web3-storage/data-segment'
import {
  AggregatorService,
  StorefrontService,
  DealTrackerService,
} from '@web3-storage/filecoin-client/types'
import {
  Store,
  UpdatableAndQueryableStore,
  Queue,
  ServiceConfig,
} from '../types.js'

export type PieceStore = UpdatableAndQueryableStore<
  PieceRecordKey,
  PieceRecord,
  Pick<PieceRecord, 'status'>
>
export type FilecoinSubmitQueue = Queue<FilecoinSubmitMessage>
export type PieceOfferQueue = Queue<PieceOfferMessage>
export type DataStore = Store<UnknownLink, AsyncIterable<Uint8Array>>
export type TaskStore = Store<UnknownLink, Invocation>
export type ReceiptStore = Store<UnknownLink, Receipt>

export interface ServiceOptions {
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
  pieceStore: PieceStore
  /**
   * Queues pieces for verification.
   */
  filecoinSubmitQueue: FilecoinSubmitQueue
  /**
   * Queues pieces for offering to an Aggregator.
   */
  pieceOfferQueue: PieceOfferQueue
  /**
   * Stores task invocations.
   */
  taskStore: TaskStore
  /**
   * Stores receipts for tasks.
   */
  receiptStore: ReceiptStore
  /**
   * Deal tracker connection to find out available deals for an aggregate.
   */
  dealTrackerService: ServiceConfig<DealTrackerService>
  /**
   * Service options.
   */
  options?: ServiceOptions
}

export interface FilecoinSubmitMessageContext
  extends Pick<ServiceContext, 'pieceStore'> {
  dataStore: DataStore
}

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

export interface ClaimsInvocationConfig {
  /**
   * Signing authority that is issuing the UCAN invocation(s).
   */
  issuer: Signer
  /**
   * The principal delegated to in the current UCAN.
   */
  audience: Principal
  /**
   * The resource the invocation applies to.
   */
  with: DID
  /**
   * Proof(s) the issuer has the capability to perform the action.
   */
  proofs?: Proof[]
}

export interface ClaimsClientContext {
  /**
   * Claims own connection to issue claims.
   */
  claimsService: {
    invocationConfig: ClaimsInvocationConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: ConnectionView<any>
  }
}

export interface CronContext
  extends Pick<
    ServiceContext,
    'id' | 'pieceStore' | 'receiptStore' | 'taskStore' | 'aggregatorId'
  > {}

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
   * Insertion date ISO string.
   */
  insertedAt: string
  /**
   * Update date ISO string.
   */
  updatedAt: string
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
