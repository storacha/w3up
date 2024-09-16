import { Result, Failure } from '@ucanto/interface'
import { MultihashDigest, Link, UnknownLink } from 'multiformats'

export type { IPLDBlock } from '@ucanto/interface'
export type { UnknownFormat } from '@web3-storage/capabilities/types'
export type { Result, MultihashDigest, Link, UnknownLink }

export type ShardDigest = MultihashDigest
export type SliceDigest = MultihashDigest
export type Position = [offset: number, length: number]

/**
 * A sharded DAG index.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-index.md
 */
export interface ShardedDAGIndex {
  /** DAG root CID that the index pertains to. */
  content: UnknownLink
  /** Index information for shards the DAG is split across. */
  shards: Map<ShardDigest, Map<SliceDigest, Position>>
}

export interface ShardedDAGIndexView extends ShardedDAGIndex {
  /** Set the offset/length information for the slice a shard. */
  setSlice(shard: ShardDigest, slice: SliceDigest, pos: Position): void
  /** Encode the index to a CAR file. */
  archive(): Promise<Result<Uint8Array>>
}

export interface DecodeFailure extends Failure {
  name: 'DecodeFailure'
}
