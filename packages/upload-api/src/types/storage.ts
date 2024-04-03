import type { Unit, Result } from '@ucanto/interface'

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

export type StoragePutError = StorageOperationError | EncodeRecordFailed
export type StorageGetError =
  | StorageOperationError
  | EncodeRecordFailed
  | RecordNotFound

export interface StorageOperationError extends Error {
  name: 'StorageOperationFailed'
}

export interface RecordNotFound extends Error {
  name: 'RecordNotFound'
}

export interface EncodeRecordFailed extends Error {
  name: 'EncodeRecordFailed'
}
