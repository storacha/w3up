import type {
  FetchOptions,
  ProgressStatus as XHRProgressStatus,
} from 'ipfs-utils/src/types'
import { Link, UnknownLink, Version } from 'multiformats/link'
import { Block } from '@ipld/unixfs'
import { CAR } from '@ucanto/transport'
import {
  ServiceMethod,
  ConnectionView,
  Signer,
  Proof,
  DID,
  Principal,
} from '@ucanto/interface'
import {
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
} from '@web3-storage/capabilities/types'
import * as UnixFS from '@ipld/unixfs/src/unixfs'

export type {
  FetchOptions,
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
}

export interface ProgressStatus extends XHRProgressStatus {
  url?: string
}

export type ProgressFn = (status: ProgressStatus) => void

export interface Service {
  store: {
    add: ServiceMethod<StoreAdd, StoreAddResponse, never>
    list: ServiceMethod<StoreList, ListResponse<StoreListResult>, never>
    remove: ServiceMethod<StoreRemove, unknown, never>
  }
  upload: {
    add: ServiceMethod<UploadAdd, UploadAddResponse, never>
    list: ServiceMethod<UploadList, ListResponse<UploadListResult>, never>
    remove: ServiceMethod<UploadRemove, UploadRemoveResponse | undefined, never>
  }
}

export type StoreAddResponse =
  | StoreAddDoneResponse
  | StoreAddUploadRequiredResponse

export interface StoreAddDoneResponse {
  status: 'done'
  with: DID
  link: CARLink
}

export interface StoreAddUploadRequiredResponse {
  status: 'upload'
  headers: Record<string, string>
  url: string
  with: DID
  link: CARLink
}

export interface UploadAddResponse {
  root: AnyLink
  shards?: CARLink[]
}

export interface UploadRemoveResponse extends UploadAddResponse {}

export interface ListResponse<R> {
  cursor?: string
  before?: string
  after?: string
  size: number
  results: R[]
}

export interface StoreListResult {
  link: CARLink
  size: number
  origin?: CARLink
}

export interface UploadListResult extends UploadAddResponse {}

export interface InvocationConfig {
  /**
   * Signing authority that is issuing the UCAN invocation(s).
   */
  issuer: Signer
  /**
   * The principal delegated to in the current UCAN.
   */
  audience?: Principal
  /**
   * The resource the invocation applies to.
   */
  with: DID
  /**
   * Proof(s) the issuer has the capability to perform the action.
   */
  proofs: Proof[]
}

export interface UnixFSEncodeResult {
  /**
   * Root CID for the DAG.
   */
  cid: UnknownLink
  /**
   * Blocks for the generated DAG.
   */
  blocks: Block[]
}

/**
 * Information present in the CAR file header.
 */
export interface CARHeaderInfo {
  /**
   * CAR version number.
   */
  version: number
  /**
   * Root CIDs present in the CAR header.
   */
  roots: Array<Link<unknown, number, number, Version>>
}

/**
 * A DAG encoded as a CAR.
 */
export interface CARFile extends CARHeaderInfo, Blob {}

/**
 * An IPLD Link that has the CAR codec code.
 */
export type CARLink = Link<unknown, typeof CAR.codec.code>

/**
 * Any IPLD link.
 */
export type AnyLink = Link<unknown, number, number, Version>

/**
 * Metadata pertaining to a CAR file.
 */
export interface CARMetadata extends CARHeaderInfo {
  /**
   * CID of the CAR file (not the data it contains).
   */
  cid: CARLink
  /**
   * Size of the CAR file in bytes.
   */
  size: number
}

export interface Retryable {
  retries?: number
}

export interface Abortable {
  signal?: AbortSignal
}

export interface Connectable {
  connection?: ConnectionView<Service>
}

export interface UploadProgressTrackable {
  onUploadProgress?: ProgressFn
}

export interface Pageable {
  /**
   * Opaque string specifying where to start retrival of the next page of
   * results.
   */
  cursor?: string
  /**
   * Maximum number of items to return.
   */
  size?: number
  /**
   * If true, return page of results preceding cursor. Defaults to false.
   */
  pre?: boolean
}

export interface RequestOptions
  extends Retryable,
    Abortable,
    Connectable,
    UploadProgressTrackable {}

export interface ListRequestOptions extends RequestOptions, Pageable {}

export type DirectoryEntryLink = UnixFS.DirectoryEntryLink

export interface UnixFSDirectoryEncoderOptions {
  /**
   * Callback for every DAG encoded directory entry, including the root.
   */
  onDirectoryEntryLink?: (link: DirectoryEntryLink) => void
}

export interface ShardingOptions {
  /**
   * The target shard size. Actual size of CAR output may be bigger due to CAR
   * header and block encoding data.
   */
  shardSize?: number
  /**
   * The root CID of the DAG contained in the shards. By default The last block
   * is assumed to be the DAG root and becomes the CAR root CID for the last CAR
   * output. Set this option to use this CID instead.
   */
  rootCID?: AnyLink
}

export interface ShardStoringOptions
  extends RequestOptions,
    UploadProgressTrackable {
  /**
   * The number of concurrent requests to store shards. Default 3.
   */
  concurrentRequests?: number
}

export interface UploadOptions
  extends RequestOptions,
    ShardingOptions,
    ShardStoringOptions,
    UploadProgressTrackable {
  onShardStored?: (meta: CARMetadata) => void
}

export interface UploadDirectoryOptions
  extends UploadOptions,
    UnixFSDirectoryEncoderOptions,
    UploadProgressTrackable {}

export interface BlobLike {
  /**
   * Returns a ReadableStream which yields the Blob data.
   */
  stream: () => ReadableStream
}

export interface FileLike extends BlobLike {
  /**
   * Name of the file. May include path information.
   */
  name: string
}
