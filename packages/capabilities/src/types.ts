import type { TupleToUnion } from 'type-fest'
import * as Ucanto from '@ucanto/interface'
import type { Schema } from '@ucanto/core'
import { InferInvokedCapability, Unit, DID, DIDKey } from '@ucanto/interface'
import type { PieceLink } from '@web3-storage/data-segment'
import { space, info } from './space.js'
import * as provider from './provider.js'
import { top } from './top.js'
import { add, list, remove, store } from './store.js'
import * as UploadCaps from './upload.js'
import * as AccessCaps from './access.js'
import * as CustomerCaps from './customer.js'
import * as ConsumerCaps from './consumer.js'
import * as SubscriptionCaps from './subscription.js'
import * as RateLimitCaps from './rate-limit.js'
import * as FilecoinCaps from './filecoin.js'
import * as RootCaps from './root.js'
import * as ShardCaps from './shard.js'


export type { Unit }

export type AccountDID = DID<'mailto'>

/**
 * failure due to a resource not having enough storage capacity.
 */
export interface InsufficientStorage {
  name: 'InsufficientStorage'
  message: string
}

export interface UnknownProvider extends Ucanto.Failure {
  name: 'UnknownProvider'
  did: DID
}

/**
 * @see https://github.com/filecoin-project/FIPs/pull/758/files
 */
export type PieceLinkSchema = Schema.Schema<PieceLink>

// Access
export type Access = InferInvokedCapability<typeof AccessCaps.access>
export type AccessAuthorize = InferInvokedCapability<
  typeof AccessCaps.authorize
>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type AccessAuthorizeSuccess = Unit
export type AccessClaim = InferInvokedCapability<typeof AccessCaps.claim>
export interface AccessClaimSuccess {
  delegations: Record<string, Ucanto.ByteView<Ucanto.Delegation>>
}
export interface AccessClaimFailure extends Ucanto.Failure {
  name: 'AccessClaimFailure'
  message: string
}

export interface AccessConfirmSuccess {
  delegations: Record<string, Ucanto.ByteView<Ucanto.Delegation>>
}
export interface AccessConfirmFailure extends Ucanto.Failure {}

export type AccessDelegate = InferInvokedCapability<typeof AccessCaps.delegate>
export type AccessDelegateSuccess = Unit
export type AccessDelegateFailure = InsufficientStorage | DelegationNotFound

export interface DelegationNotFound extends Ucanto.Failure {
  name: 'DelegationNotFound'
}

export type AccessSession = InferInvokedCapability<typeof AccessCaps.session>
export type AccessConfirm = InferInvokedCapability<typeof AccessCaps.confirm>

// Provider
export type ProviderAdd = InferInvokedCapability<typeof provider.add>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProviderAddSuccess {}
export type ProviderAddFailure = InvalidProvider | Ucanto.Failure
export type ProviderDID = DID<'web'>

export interface InvalidProvider extends Ucanto.Failure {
  name: 'InvalidProvider'
}

// Customer
export type CustomerGet = InferInvokedCapability<typeof CustomerCaps.get>
export interface CustomerGetSuccess {
  did: AccountDID
  subscriptions: string[]
}
export interface CustomerNotFound extends Ucanto.Failure {
  name: 'CustomerNotFound'
}
export type CustomerGetFailure = CustomerNotFound | Ucanto.Failure

// Consumer
export type ConsumerHas = InferInvokedCapability<typeof ConsumerCaps.has>
export type ConsumerHasSuccess = boolean
export type ConsumerHasFailure = Ucanto.Failure
export type ConsumerGet = InferInvokedCapability<typeof ConsumerCaps.get>
export interface ConsumerGetSuccess {
  did: DIDKey
  allocated: number
  limit: number
  subscription: string
}
export interface ConsumerNotFound extends Ucanto.Failure {
  name: 'ConsumerNotFound'
}
export type ConsumerGetFailure = ConsumerNotFound | Ucanto.Failure

// Subscription
export type SubscriptionGet = InferInvokedCapability<
  typeof SubscriptionCaps.get
>
export interface SubscriptionGetSuccess {
  customer: AccountDID
  consumer?: DIDKey
}
export interface SubscriptionNotFound extends Ucanto.Failure {
  name: 'SubscriptionNotFound'
}
export type SubscriptionGetFailure =
  | SubscriptionNotFound
  | UnknownProvider
  | Ucanto.Failure

// Rate Limit
export type RateLimitAdd = InferInvokedCapability<typeof RateLimitCaps.add>
export interface RateLimitAddSuccess {
  id: string
}
export type RateLimitAddFailure = Ucanto.Failure

export type RateLimitRemove = InferInvokedCapability<
  typeof RateLimitCaps.remove
>
export type RateLimitRemoveSuccess = Unit

export interface RateLimitsNotFound extends Ucanto.Failure {
  name: 'RateLimitsNotFound'
}
export type RateLimitRemoveFailure = RateLimitsNotFound | Ucanto.Failure

export type RateLimitList = InferInvokedCapability<typeof RateLimitCaps.list>
export interface RateLimitSubject {
  id: string
  rate: number
}
export interface RateLimitListSuccess {
  limits: RateLimitSubject[]
}
export type RateLimitListFailure = Ucanto.Failure

// Space
export type Space = InferInvokedCapability<typeof space>
export type SpaceInfo = InferInvokedCapability<typeof info>

// filecoin
export type FILECOIN_PROCESSING_STATUS = 'pending' | 'done'
export interface FilecoinAddSuccess {
  piece: PieceLink
}
export interface FilecoinAddFailure extends Ucanto.Failure {
  name: string
}

export interface AggregateAddSuccess {
  piece: PieceLink
  aggregate?: PieceLink
}
export interface AggregateAddFailure extends Ucanto.Failure {
  name: string
}

export interface DealAddSuccess {
  aggregate?: PieceLink
}

export type DealAddFailure = DealAddParseFailure | DealAddFailureWithBadPiece

export interface DealAddParseFailure extends Ucanto.Failure {
  name: string
}

export interface DealAddFailureWithBadPiece extends Ucanto.Failure {
  piece?: PieceLink
  cause?: DealAddFailureCause[] | unknown
}

export interface DealAddFailureCause {
  piece: PieceLink
  reason: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChainTrackerInfoSuccess {
  // TODO
}

export interface ChainTrackerInfoFailure extends Ucanto.Failure {
  // TODO
}

// Upload
export type Upload = InferInvokedCapability<typeof UploadCaps.upload>
export type UploadAdd = InferInvokedCapability<typeof UploadCaps.add>
export type UploadRemove = InferInvokedCapability<typeof UploadCaps.remove>
export type UploadList = InferInvokedCapability<typeof UploadCaps.list>
// Store
export type Store = InferInvokedCapability<typeof store>
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>
// Root
export type Root = InferInvokedCapability<typeof RootCaps.root>
export type RootGet = InferInvokedCapability<typeof RootCaps.get>
export interface RootGetSuccess {
  spaces: Array<{ did: DID, insertedAt: Date }>
}
export type RootGetFailure = Ucanto.Failure
// Shard
export type Shard = InferInvokedCapability<typeof ShardCaps.shard>
export type ShardGet = InferInvokedCapability<typeof ShardCaps.get>
export interface ShardGetSuccess {
  spaces: Array<{ did: DID, insertedAt: Date }>
}
export type ShardGetFailure = Ucanto.Failure

// Filecoin
export type FilecoinQueue = InferInvokedCapability<
  typeof FilecoinCaps.filecoinQueue
>
export type FilecoinAdd = InferInvokedCapability<
  typeof FilecoinCaps.filecoinAdd
>
export type AggregateQueue = InferInvokedCapability<
  typeof FilecoinCaps.aggregateQueue
>
export type AggregateAdd = InferInvokedCapability<
  typeof FilecoinCaps.aggregateAdd
>
export type DealQueue = InferInvokedCapability<typeof FilecoinCaps.dealQueue>
export type DealAdd = InferInvokedCapability<typeof FilecoinCaps.dealAdd>
export type ChainTrackerInfo = InferInvokedCapability<
  typeof FilecoinCaps.chainTrackerInfo
>
// Top
export type Top = InferInvokedCapability<typeof top>

export type Abilities = TupleToUnion<AbilitiesArray>

export type AbilitiesArray = [
  Top['can'],
  ProviderAdd['can'],
  Space['can'],
  SpaceInfo['can'],
  Upload['can'],
  UploadAdd['can'],
  UploadRemove['can'],
  UploadList['can'],
  Store['can'],
  StoreAdd['can'],
  StoreRemove['can'],
  StoreList['can'],
  Access['can'],
  AccessAuthorize['can'],
  AccessSession['can'],
  CustomerGet['can'],
  ConsumerHas['can'],
  ConsumerGet['can'],
  SubscriptionGet['can'],
  RateLimitAdd['can'],
  RateLimitRemove['can'],
  RateLimitList['can'],
  FilecoinQueue['can'],
  FilecoinAdd['can'],
  AggregateQueue['can'],
  AggregateAdd['can'],
  DealQueue['can'],
  DealAdd['can'],
  ChainTrackerInfo['can'],
  Root['can'],
  RootGet['can'],
  Shard['can'],
  ShardGet['can']
]
