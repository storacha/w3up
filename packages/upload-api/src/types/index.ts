import { MultihashDigest } from 'multiformats'
import { Failure, Result, Unit } from '@ucanto/interface'
import { ShardedDAGIndex } from '../index/lib/api.js'
import { AllocationsStorage } from './blob.js'

export type {
  ShardDigest,
  SliceDigest,
  ShardedDAGIndex,
} from '../index/lib/api.js'

/**
 * Service that allows publishing a set of multihashes to IPNI for a
 * pre-configured provider.
 */
export interface IPNIService {
  /** Publish the multihashes in the provided index to IPNI. */
  publish(index: ShardedDAGIndex): Promise<Result<Unit, Failure>>
}

export interface BlobNotFound extends Failure {
  name: 'BlobNotFound'
  digest: Uint8Array
}

/** Retrieve a blob from the network. */
export interface BlobRetriever {
  stream(
    digest: MultihashDigest
  ): Promise<Result<ReadableStream<Uint8Array>, BlobNotFound>>
}

export interface IndexServiceContext {
  allocationsStorage: AllocationsStorage
  blobRetriever: BlobRetriever
  ipniService: IPNIService
}
