import * as Ucanto from '@ucanto/interface'
import { ProviderAdd } from '@web3-storage/capabilities/src/types'

export type AlphaStorageProvider = 'did:web:web3.storage:providers:w3up-alpha'

/**
 * action which results in provisionment of a space consuming a storage provider
 */
export interface Provision {
  invocation: Ucanto.Invocation<ProviderAdd>
  space: Ucanto.DID<'key'>
  account: Ucanto.DID<'mailto'>
  provider: AlphaStorageProvider
}

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface ProvisionsStorage {
  hasStorageProvider: (consumer: Ucanto.DID<'key'>) => Promise<boolean>
  /**
   * ensure item is stored
   *
   * @param item - provision to store
   */
  put: (item: Provision) => Promise<void>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>
}
