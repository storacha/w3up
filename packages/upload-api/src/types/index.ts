import { MultihashDigest } from 'multiformats'
import { Failure, Result } from '@ucanto/interface'
import { ShardedDAGIndex } from '@storacha/blob-index/types'
import { Registry } from './blob.js'
import { ClaimsClientContext } from './content-claims.js'

export type { ShardedDAGIndex, ClaimsClientContext }

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

export interface IndexServiceContext extends ClaimsClientContext {
  blobRetriever: BlobRetriever
  registry: Registry
}
