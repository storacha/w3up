import {
  AgentData,
  AgentMeta,
  CIDString,
  DelegationMeta,
  SpaceMeta,
} from '../types.js'
import { RSASigner } from '@ucanto/principal/rsa'
import { SignerArchive, DID } from '@ucanto/interface'

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
   * Persist data to the store's backend
   *
   * @param data
   */
  save: (data: T) => Promise<IStore<T>>
  /**
   * Loads data from the store's backend
   */
  load: () => Promise<T|undefined>
  /**
   * Clean all the data in the store's backend
   */
  reset: () => Promise<void>
}
