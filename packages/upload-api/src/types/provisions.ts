import type {
  AccountDID,
  ConsumerGetSuccess,
  ProviderDID,
} from '@storacha/capabilities/types'
import * as Ucanto from '@ucanto/interface'
import { ProviderAdd } from '@storacha/capabilities/types'
import { SpaceDID } from '../types.js'

/**
 * action which results in provisionment of a space consuming a storage provider
 */
export interface Provision {
  cause: Ucanto.Invocation<ProviderAdd>
  consumer: Ucanto.DID<'key'>
  customer: Ucanto.DID<'mailto'>
  provider: ProviderDID
}

export interface Customer {
  did: Ucanto.DID<'mailto'>
  subscriptions: string[]
}

export interface Subscription {
  customer: AccountDID
  consumer?: Ucanto.DIDKey
}

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface ProvisionsStorage<ProviderDID = Ucanto.DID<'web'>> {
  services: ProviderDID[]
  hasStorageProvider: (
    consumer: SpaceDID
  ) => Promise<Ucanto.Result<boolean, never>>
  getStorageProviders: (
    consumer: SpaceDID
  ) => Promise<Ucanto.Result<ProviderDID[], never>>
  /**
   * ensure item is stored
   *
   * @param item - provision to store
   */
  put: (
    item: Provision
  ) => Promise<Ucanto.Result<{ id: string }, Ucanto.Failure>>

  /**
   * Returns information about a customer related to the given provider.
   *
   * TODO: this should be moved out to a consumers store
   *
   * @param provider DID of the provider we care about
   * @param consumer DID of the consumer
   * @returns record for the specified customer, if it is in our system
   */
  getConsumer: (
    provider: ProviderDID,
    consumer: Ucanto.DIDKey
  ) => Promise<Ucanto.Result<ConsumerGetSuccess, Ucanto.Failure>>

  /**
   * Returns information about a customer related to the given provider.
   *
   * TODO: this should be moved out to a subscriptions store (and maybe eventually a "customers" store)
   *
   * @param provider DID of the provider we care about
   * @param customer DID of the customer
   * @returns record for the specified customer, if it is in our system
   */
  getCustomer: (
    provider: ProviderDID,
    customer: AccountDID
  ) => Promise<Ucanto.Result<Customer, Ucanto.Failure>>

  /**
   * Returns information about a subscription to a provider.
   *
   * TODO: this should be moved out to a subscriptions store
   *
   * @returns subscription information for a given subscription ID at the given provider
   */
  getSubscription: (
    provider: ProviderDID,
    subscription: string
  ) => Promise<Ucanto.Result<Subscription, Ucanto.Failure>>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>
}
