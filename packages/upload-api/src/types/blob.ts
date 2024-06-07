import type {
  UnknownLink,
  Invocation,
  Result,
  Failure,
  DID,
  URI,
} from '@ucanto/interface'
import {
  Multihash,
  BlobListItem,
  BlobRemoveSuccess,
  BlobGetSuccess,
} from '@web3-storage/capabilities/types'
import { MultihashDigest } from 'multiformats'

import { RecordKeyConflict, ListResponse } from '../types.js'
import { Storage } from './storage.js'

export type TasksStorage = Storage<UnknownLink, Invocation>

export interface AllocationsStorage {
  get: (
    space: DID,
    digest: MultihashDigest
  ) => Promise<Result<BlobGetSuccess, Failure>>
  exists: (
    space: DID,
    digest: MultihashDigest
  ) => Promise<Result<boolean, Failure>>
  /** Inserts an item in the table if it does not already exist. */
  insert: (
    item: BlobAddInput
  ) => Promise<Result<BlobAddOutput, RecordKeyConflict>>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<Result<ListResponse<BlobListItem>, Failure>>
  /** Removes an item from the table, returning zero on size if non existent. */
  remove: (
    space: DID,
    digest: MultihashDigest
  ) => Promise<Result<BlobRemoveSuccess, Failure>>
}

export interface ListOptions {
  size?: number
  cursor?: string
}

export interface BlobModel {
  digest: Multihash
  size: number
}

export interface BlobAddInput {
  space: DID
  cause: UnknownLink
  blob: BlobModel
}

export interface BlobAddOutput extends Omit<BlobAddInput, 'space' | 'cause'> {}

export interface BlobsStorage {
  has: (content: MultihashDigest) => Promise<Result<boolean, Failure>>
  createUploadUrl: (
    content: MultihashDigest,
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
  createDownloadUrl: (content: MultihashDigest) => Promise<Result<URI, Failure>>
}
