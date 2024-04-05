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
} from '@web3-storage/capabilities/types'

import {
  RecordKeyConflict,
  ListOptions,
  ListResponse,
} from '../types.js'
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
}

export interface Blob {
  content: BlobMultihash
  size: number
}

export interface BlobAddInput {
  space: DID
  invocation: UnknownLink
  blob: Blob
}

export interface BlobAddOutput
  extends Omit<BlobAddInput, 'space' | 'invocation'> {}

export interface BlobGetOutput {
  blob: { content: Uint8Array; size: number }
  invocation: UnknownLink
}

export interface BlobsStorage {
  has: (content: BlobMultihash) => Promise<Result<boolean, Failure>>
  createUploadUrl: (
    content: BlobMultihash,
    size: number
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
