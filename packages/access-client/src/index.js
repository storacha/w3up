export * from '@web3-storage/w3up-client/agent'

// Workaround for typedoc until 0.24 supports export maps
export * as Encoding from '@web3-storage/w3up-client/agent/encoding'
export { StoreConf } from '@web3-storage/w3up-client/store/conf'
export { StoreIndexedDB } from '@web3-storage/w3up-client/store/indexed-db'
export { StoreMemory } from '@web3-storage/w3up-client/store/memory'
