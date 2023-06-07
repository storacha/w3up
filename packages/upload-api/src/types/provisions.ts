import type { ProviderDID } from '@web3-storage/capabilities/src/types'
import * as Ucanto from '@ucanto/interface'
import { ProviderAdd } from '@web3-storage/capabilities/src/types'

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
}

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface ProvisionsStorage<
  ProviderDID = Ucanto.DID<'web'>
> {
  services: ProviderDID[]
  hasStorageProvider: (
    consumer: Ucanto.DID<'key'>
  ) => Promise<Ucanto.Result<boolean, never>>
  /**
   * ensure item is stored
   *
   * @param item - provision to store
   */
  put: (
    item: Provision
  ) => Promise<Ucanto.Result<{}, Ucanto.Failure>>

  /**
   * Returns information about a customer related to the given provider.
   * 
   * TODO: this should probably be moved to its own Storage interface, but 
   * I'd like to tackle that once we've finished consolidating the access and upload services.
   * 
   * @param provider DID of the provider we care about
   * @param customer DID of the customer
   * @returns record for the specified customer, if it is in our system
   */
  getCustomer: (
    provider: ProviderDID,
    customer: Ucanto.DID<'mailto'>
  ) => Promise<Ucanto.Result<Customer | null, Ucanto.Failure>>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>
}
