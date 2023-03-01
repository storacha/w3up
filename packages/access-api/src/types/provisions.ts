import * as Ucanto from '@ucanto/interface'

export type AlphaStorageProvider = 'did:web:web3.storage:providers:w3up-alpha'

export interface StorageProvisionCreation {
  space: Ucanto.DID<'key'>
  account: Ucanto.DID<'mailto'>
  provider: AlphaStorageProvider
}

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface StorageProvisions {
  hasStorageProvider: (consumer: Ucanto.DID<'key'>) => boolean
  create: (provision: StorageProvisionCreation) => Promise<void>
}
