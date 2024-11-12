import type {
  UnknownLink,
  Link,
  Invocation,
  Result,
  Failure,
  Capability,
  ServiceMethod,
  UCANOptions,
  IssuedInvocationView,
  ConnectionView,
  Principal,
  Unit,
} from '@ucanto/interface'
import {
  Multihash,
  BlobAllocate,
  BlobAccept,
  BlobAllocateSuccess,
  BlobAcceptSuccess,
} from '@storacha/capabilities/types'
import { MultihashDigest } from 'multiformats'
import { ListResponse, SpaceDID } from '../types.js'
import { Storage } from './storage.js'

export interface Blob {
  digest: MultihashDigest
  size: number
}

export interface Entry {
  blob: Blob
  cause: Link
  insertedAt: Date
}

/** Indicates an entry was not found that matches the passed details. */
export interface EntryNotFound extends Failure {
  name: 'EntryNotFound'
}

/** Indicates an entry has already been registered for the passed details. */
export interface EntryExists extends Failure {
  name: 'EntryExists'
}

export type TasksStorage = Storage<UnknownLink, Invocation>

export interface Registry {
  /** Lookup an existing registration. */
  find: (
    space: SpaceDID,
    digest: MultihashDigest
  ) => Promise<Result<Entry, EntryNotFound>>
  /** Adds an item into the registry if it does not already exist. */
  register: (item: RegistrationData) => Promise<Result<Unit, EntryExists>>
  /** List entries in the registry for a given space. */
  entries: (
    space: SpaceDID,
    options?: ListOptions
  ) => Promise<Result<ListResponse<Entry>, Failure>>
  /** Removes an item from the registry if it exists. */
  deregister: (
    space: SpaceDID,
    digest: MultihashDigest
  ) => Promise<Result<Unit, EntryNotFound>>
}

export interface ListOptions {
  size?: number
  cursor?: string
}

export interface BlobModel {
  digest: Multihash
  size: number
}

export interface RegistrationData {
  space: SpaceDID
  cause: Link
  blob: Blob
}

export interface BlobService {
  blob: {
    allocate: ServiceMethod<BlobAllocate, BlobAllocateSuccess, Failure>
    accept: ServiceMethod<BlobAccept, BlobAcceptSuccess, Failure>
  }
}

export interface Configuration<C extends Capability> {
  /** Connection to the storage node. */
  connection: ConnectionView<BlobService>
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
  selectStorageProvider(
    digest: MultihashDigest,
    size: number
  ): Promise<Result<Principal, CandidateUnavailable | Failure>>
  /**
   * Returns information required to make an invocation to the requested storage
   * node.
   */
  configureInvocation<C extends BlobAllocate | BlobAccept>(
    provider: Principal,
    capability: C,
    options?: Omit<UCANOptions, 'audience'>
  ): Promise<Result<Configuration<C>, ProofUnavailable | Failure>>
}
