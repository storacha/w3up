import type { ProviderDID } from '@web3-storage/capabilities/src/types'
import * as Ucanto from '@ucanto/interface'
import { ProviderAdd } from '@web3-storage/capabilities/src/types'
import { SpaceDID } from '../types'

/**
 * action which results in provisionment of a space consuming a storage provider
 */
export interface Provision {
  cause: Ucanto.Invocation<ProviderAdd>
  consumer: Ucanto.DID<'key'>
  customer: Ucanto.DID<'mailto'>
  provider: ProviderDID
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
   * get number of stored items
   */
  count: () => Promise<bigint>

  /**
   * is the given space blocked?
   */
  isSpaceBlocked: (spaceDID: SpaceDID) => Promise<Ucanto.Result<boolean, never>>
}
