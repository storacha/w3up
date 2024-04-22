import type {
  UnknownLink,
  Invocation,
  Result,
  Failure,
  DID,
} from '@ucanto/interface'
import {
  BlobMultihash,
  BlobListItem,
  BlobRemoveSuccess,
} from '@web3-storage/capabilities/types'

import { RecordKeyConflict, ListResponse } from '../types.js'
import { Storage } from './storage.js'

export type TasksStorage = Storage<UnknownLink, Invocation>

export interface AllocationsStorage {
  get: (
    space: DID,
    blobMultihash: BlobMultihash
  ) => Promise<Result<BlobGetOutput, Failure>>
  exists: (
    space: DID,
    blobMultihash: BlobMultihash
  ) => Promise<Result<boolean, Failure>>
  /** Inserts an item in the table if it does not already exist. */
  insert: (
    item: BlobAddInput
  ) => Promise<Result<BlobAddOutput, RecordKeyConflict>>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<Result<ListResponse<BlobListItem>, Failure>>
  /** Removes an item from the table but fails if the item does not exist. */
  remove: (
    space: DID,
    digest: BlobMultihash
  ) => Promise<Result<BlobRemoveSuccess, Failure>>
}

export interface ListOptions {
  size?: number
  cursor?: string
}

export interface BlobModel {
  digest: BlobMultihash
  size: number
}

export interface BlobAddInput {
  space: DID
  cause: UnknownLink
  blob: BlobModel
}

export interface BlobAddOutput extends Omit<BlobAddInput, 'space' | 'cause'> {}

export interface BlobGetOutput {
  blob: { digest: Uint8Array; size: number }
  cause: UnknownLink
}

export interface BlobsStorage {
  has: (content: BlobMultihash) => Promise<Result<boolean, Failure>>
  createUploadUrl: (
    content: BlobMultihash,
    size: number,
    /**
     * The number of seconds before the presigned URL expires
     */
    expiresIn: number
  ) => Promise<
    Result<
      {
        url: URL
        headers: {
          'x-amz-checksum-sha256': string
          'content-length': string
        } & Record<string, string>
      },
      Failure
    >
  >
}
