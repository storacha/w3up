import type {
  UnknownLink,
  Invocation,
  Result,
  Failure,
  DID,
  URI,
  Capability,
  Connection,
  ServiceMethod,
  UCANOptions,
  IssuedInvocationView,
  ConnectionView,
  Principal,
} from '@ucanto/interface'
import {
  Multihash,
  BlobListItem,
  BlobRemoveSuccess,
  BlobGetSuccess,
  BlobAllocate,
  BlobAccept,
  BlobAllocateSuccess,
  BlobAcceptSuccess,
} from '@storacha/capabilities/types'
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

export interface BlobService {
  blob: {
    allocate: ServiceMethod<BlobAllocate, BlobAllocateSuccess, Failure>
    accept: ServiceMethod<BlobAccept, BlobAcceptSuccess, Failure>
  }
}

export interface Configuration<C extends Capability> extends UCANOptions {
  /** Connection to the storage node. */
  connection: ConnectionView<BlobService>,
  /** Invocation to execute. */
  invocation: IssuedInvocationView<C>
}

/**
 * An unavailable proof error is returned when the routing does not have a 
 * valid unexpired and unrevoked proof available.
 */
export interface ProofUnavailable extends Failure {
  name: 'ProofUnavailable'
}

/**
 * An unavailable candidate error is returned when there are no candidates
 * willing to allocate space for the given blob.
 */
export interface CandidateUnavailable extends Failure {
  name: 'CandidateUnavailable'
}

/**
 * The routing service is responsible for selecting storage nodes to allocate
 * blobs with.
 */
export interface RoutingService {
  /**
   * Selects a candidate for blob allocation from the current list of available
   * storage nodes.
   */
  selectStorageProvider(digest: MultihashDigest, size: number):
    Promise<Result<Principal, CandidateUnavailable|Failure>>
  /**
   * Returns information required to make an invocation to the requested storage
   * node.
   */
  configureInvocation<C extends BlobAllocate|BlobAccept>(provider: Principal, capability: C, options?: Omit<UCANOptions, 'audience'>):
    Promise<Result<Configuration<C>, ProofUnavailable|Failure>>
}
