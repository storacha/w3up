import type { DID, Link, Result, Failure } from '@ucanto/interface'
import type { Text, Row } from './database.js'
import type * as Capabilities from '@web3-storage/capabilities/types'

export interface SubscriptionID {
  cause: Text<Link>
}

export interface Subscription extends Capabilities.Subscription {
  cause: Text<Link>
  order: Text<Link>
}

export interface SubscriptionRecord extends Subscription, Row {}

export interface SubscriptionStore {
  add: (subscription: Subscription) => Promise<Result<SubscriptionID, Failure>>
  find: (query: SubscriptionQuery) => Promise<Capabilities.SubscriptionRecord[]>
}

export interface SubscriptionQuery {
  customer?: DID<'mailto'>
  provider?: DID<'web'>
  order?: Link
}
