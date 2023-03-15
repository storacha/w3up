import type { DID, Link } from '@ucanto/interface'
import type { Database, TextColumn, Row } from './database.js'
import type * as Capabilities from '@web3-storage/capabilities/types'

export interface Subscription extends Capabilities.Subscription {
  cause: TextColumn<Link>
  order: TextColumn<Link>
}

export type SubscriptionRecord = Row<Subscription>

export interface SubscriptionDB
  extends Database<{
    subscriptions: SubscriptionRecord
  }> {}

export interface SubscriptionStore {
  add: (subscription: Subscription) => Promise<Subscription>
  find: (query: Query) => Promise<Capabilities.SubscriptionRecord[]>
}

export interface Query {
  customer?: DID<'mailto'>
  provider?: DID<'web'>
  order?: Link
}
