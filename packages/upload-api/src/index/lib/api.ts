import { Failure } from '@ucanto/interface'
import { MultihashDigest, UnknownLink } from 'multiformats'

export type { Result } from '@ucanto/interface'
export type { UnknownFormat } from '@web3-storage/capabilities/types'

export type ShardDigest = MultihashDigest
export type SliceDigest = MultihashDigest

/**
 * A sharded DAG index.
 *
 * @see https://github.com/w3s-project/specs/blob/main/w3-index.md
 */
export interface ShardedDAGIndex {
  content: UnknownLink
  shards: Map<ShardDigest, Map<SliceDigest, [offset: number, length: number]>>
}

export interface DecodeFailure extends Failure {
  name: 'DecodeFailure'
}
