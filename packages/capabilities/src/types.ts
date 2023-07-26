import type { TupleToUnion } from 'type-fest'
import * as Ucanto from '@ucanto/interface'
import { InferInvokedCapability, Unit, DID, DIDKey } from '@ucanto/interface'
import { space, info, recover, recoverValidation } from './space.js'
import * as provider from './provider.js'
import { top } from './top.js'
import { add, list, remove, store } from './store.js'
import * as UploadCaps from './upload.js'
import { claim, redeem } from './voucher.js'
import * as AccessCaps from './access.js'
import * as AggregateCaps from './aggregate.js'
import * as OfferCaps from './offer.js'
import * as CustomerCaps from './customer.js'
import * as ConsumerCaps from './consumer.js'
import * as SubscriptionCaps from './subscription.js'
import * as RateLimitCaps from './rate-limit.js'

export type { Unit }

export type AccountDID = DID<'mailto'>

/**
 * failure due to a resource not having enough storage capacity.
 */
export interface InsufficientStorage {
  name: 'InsufficientStorage'
  message: string
}

export interface UnknownProvider {
  name: 'UnknownProvider',
  did: DID
}

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
}
export interface CustomerNotFound extends Ucanto.Failure { 
  name: 'CustomerNotFound'
}
export type CustomerGetFailure = CustomerNotFound

// Consumer
export type ConsumerHas = InferInvokedCapability<typeof ConsumerCaps.has>
export type ConsumerHasSuccess = boolean
export type ConsumerHasFailure = Ucanto.Failure
export type ConsumerGet = InferInvokedCapability<typeof ConsumerCaps.get>
export interface ConsumerGetSuccess {
  did: DIDKey,
  allocated: number,
  total: number,
  subscription: string
}
export interface ConsumerNotFound extends Ucanto.Failure {
  name: 'ConsumerNotFound'
}
export type ConsumerGetFailure = ConsumerNotFound

// Subscription
export type SubscriptionGet = InferInvokedCapability<typeof SubscriptionCaps.get>
export interface SubscriptionGetSuccess {
  customer: AccountDID
  consumer: DIDKey
}
export interface SubscriptionNotFound extends Ucanto.Failure {
  name: 'SubscriptionNotFound'
}
export type SubscriptionGetFailure = SubscriptionNotFound | UnknownProvider

// Rate Limit
export type RateLimitAdd = InferInvokedCapability<typeof RateLimitCaps.add>
export interface RateLimitAddSuccess {
  id: string
}
export type RateLimitAddFailure = Ucanto.Failure

export type RateLimitRemove = InferInvokedCapability<typeof RateLimitCaps.remove>
export type RateLimitRemoveSuccess = {}
export interface RateLimitsNotFound extends Ucanto.Failure {
  name: 'RateLimitsNotFound'
}
export type RateLimitRemoveFailure = RateLimitsNotFound

export type RateLimitList = InferInvokedCapability<typeof RateLimitCaps.list>
export interface RateLimit {
  id: string,
  limit: number
}
export interface RateLimitListSuccess {
  limits: RateLimit[]
}
export type RateLimitListFailure = Ucanto.Failure


// Space
export type Space = InferInvokedCapability<typeof space>
export type SpaceInfo = InferInvokedCapability<typeof info>
export type SpaceRecoverValidation = InferInvokedCapability<
  typeof recoverValidation
>
export type SpaceRecover = InferInvokedCapability<typeof recover>

// Aggregate
export interface AggregateGetSuccess {
  deals: unknown[]
}
export interface AggregateGetFailure extends Ucanto.Failure {
  name: 'AggregateNotFound'
}

export interface AggregateOfferSuccess {
  status: string
}
export interface AggregateOfferFailure extends Ucanto.Failure {
  name:
    | 'AggregateOfferInvalidSize'
    | 'AggregateOfferBlockNotFound'
    | 'AggregateOfferInvalidUrl'
}

export interface OfferArrangeSuccess {
  status: string
}
export interface OfferArrangeFailure extends Ucanto.Failure {
  name: 'OfferArrangeNotFound'
}

// Voucher Protocol
export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
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
// Aggregate
export type AggregateOffer = InferInvokedCapability<typeof AggregateCaps.offer>
export type AggregateGet = InferInvokedCapability<typeof AggregateCaps.get>
// Offer
export type OfferArrange = InferInvokedCapability<typeof OfferCaps.arrange>

// Top
export type Top = InferInvokedCapability<typeof top>

export type Abilities = TupleToUnion<AbilitiesArray>

export type AbilitiesArray = [
  Top['can'],
  ProviderAdd['can'],
  Space['can'],
  SpaceInfo['can'],
  SpaceRecover['can'],
  SpaceRecoverValidation['can'],
  Upload['can'],
  UploadAdd['can'],
  UploadRemove['can'],
  UploadList['can'],
  Store['can'],
  StoreAdd['can'],
  StoreRemove['can'],
  StoreList['can'],
  VoucherClaim['can'],
  VoucherRedeem['can'],
  Access['can'],
  AccessAuthorize['can'],
  AccessSession['can'],
  AggregateOffer['can'],
  AggregateGet['can'],
  OfferArrange['can'],
  CustomerGet['can'],
  ConsumerHas['can'],
  ConsumerGet['can'],
  SubscriptionGet['can'],
  RateLimitAdd['can'],
  RateLimitRemove['can'],
  RateLimitList['can']
]
