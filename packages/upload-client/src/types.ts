import type {
  FetchOptions,
  ProgressStatus as XHRProgressStatus,
} from 'ipfs-utils/src/types'
import { Link, ToString, UnknownLink, Version } from 'multiformats/link'
import { Block } from '@ipld/unixfs'
import { CAR } from '@ucanto/transport'
import {
  ServiceMethod,
  ConnectionView,
  Signer,
  Proof,
  DID,
  Principal,
  Unit,
  Failure,
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
    add: ServiceMethod<StoreAdd, StoreAddOk, Failure>
    remove: ServiceMethod<StoreRemove, Unit, Failure>
    list: ServiceMethod<StoreList, StoreListOk, Failure>
  }
  upload: {
    add: ServiceMethod<UploadAdd, UploadAddOk, Failure>
    remove: ServiceMethod<UploadRemove, UploadRemoveOk, Failure>
    list: ServiceMethod<UploadList, UploadListOk, Failure>
  }
}

export type StoreAddOk = StoreAddDone | StoreAddUpload

export interface StoreListOk extends ListResponse<StoreListItem> {}

export interface StoreAddDone {
  status: 'done'
  with: DID
  link: UnknownLink
  url?: undefined
  headers?: undefined
}

export interface StoreAddUpload {
  status: 'upload'
  with: DID
  link: UnknownLink
  url: ToString<URL>
  headers: Record<string, string>
}

export interface UploadAddOk {
  root: AnyLink
  shards?: CARLink[]
}

export type UploadRemoveOk = UploadDIDRemove | UploadDidNotRemove
export interface UploadDidNotRemove {
  root?: undefined
  shards?: undefined
}

export interface UploadDIDRemove extends UploadAddOk {}
export interface UploadListOk extends ListResponse<UploadListItem> {}

export interface ListResponse<R> {
  cursor?: string
  before?: string
  after?: string
  size: number
  results: R[]
}

export interface StoreListItem {
  link: CARLink
  size: number
  origin?: CARLink
}

export interface UploadListItem extends UploadAddOk {}

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
  /**
   * The CAR file data that was stored.
   */
  blob(): Promise<Blob>
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
  /**
   * A function called after a DAG shard has been successfully stored by the
   * service.
   */
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
