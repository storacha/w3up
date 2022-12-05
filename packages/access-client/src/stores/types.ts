import {
  AgentData,
  AgentMeta,
  CIDString,
  DelegationMeta,
  SpaceMeta,
} from '../types.js'
import { SignerArchive, DID, DIDKey } from '@ucanto/interface'
import { RSA } from '@ucanto/principal'

/**
 * Store interface that all stores need to implement
 */
export interface IStore<T> {
  /**
   * Open store
   */
  open: () => Promise<IStore<T>>
  /**
   * Clean up and close store
   */
  close: () => Promise<void>
  /**
   * Check if store exists and is initialized
   */
  exists: () => Promise<boolean>
  /**
   * Initilize store with data
   *
   * @param data
   */
  init: (data: Partial<AgentData<T>>) => Promise<AgentData<T>>
  /**
   * Persist data to the store's backend
   *
   * @param data
   */
  save: (data: AgentData<T>) => Promise<IStore<T>>
  /**
   * Loads data from the store's backend
   */
  load: () => Promise<AgentData<T>>
  /**
   * Clean all the data in the store's backend
   */
  reset: () => Promise<void>
}

// Store IDB
export interface StoreDataIDB {
  id: number
  meta: AgentMeta
  principal: SignerArchive<DIDKey, typeof RSA.signatureCode>
  currentSpace?: DID
  spaces: Map<DID, SpaceMeta>
  delegations: Map<
    CIDString,
    {
      meta: DelegationMeta
      delegation: Array<{ cid: CIDString; bytes: Uint8Array }>
    }
  >
}
