import type { Unit, Result } from '@ucanto/interface'
import { StorageGetError, StoragePutError } from '@storacha/capabilities/types'

export type { StorageGetError, StoragePutError }

export interface Storage<RecKey, Rec> {
  /**
   * Puts a record in the store.
   */
  put: (record: Rec) => Promise<Result<Unit, StoragePutError>>
  /**
   * Gets a record from the store.
   */
  get: (key: RecKey) => Promise<Result<Rec, StorageGetError>>
  /**
   * Determine if a record already exists in the store for the given key.
   */
  has: (key: RecKey) => Promise<Result<boolean, StorageGetError>>
}
