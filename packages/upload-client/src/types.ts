import type {
  FetchOptions,
  ProgressStatus as XHRProgressStatus,
} from 'ipfs-utils/src/types.js'
import { Link, UnknownLink, Version } from 'multiformats/link'
import { Block } from '@ipld/unixfs'
import {
  ServiceMethod,
  ConnectionView,
  Signer,
  Proof,
  DID,
  Principal,
  Failure,
} from '@ucanto/interface'
import {
  StoreAdd,
  StoreAddSuccess,
  StoreAddSuccessUpload,
  StoreAddSuccessDone,
  StoreGet,
  StoreGetFailure,
  StoreList,
  StoreListSuccess,
  StoreListItem,
  StoreRemove,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  UploadAdd,
  UploadAddSuccess,
  UploadList,
  UploadListSuccess,
  UploadListItem,
  UploadRemove,
  UploadRemoveSuccess,
  ListResponse,
  CARLink,
  PieceLink,
  StoreGetSuccess,
  UploadGet,
  UploadGetSuccess,
  UploadGetFailure,
  UsageReport,
  UsageReportSuccess,
  UsageReportFailure,
} from '@web3-storage/capabilities/types'

export type {
  FetchOptions,
  StoreAdd,
  StoreAddSuccess,
  StoreAddSuccessUpload,
  StoreAddSuccessDone,
  StoreGetSuccess,
  StoreGetFailure,
  StoreList,
  StoreListSuccess,
  StoreListItem,
  StoreRemove,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  UploadAdd,
  UploadAddSuccess,
  UploadGetSuccess,
  UploadGetFailure,
  UploadList,
  UploadListSuccess,
  UploadListItem,
  UploadRemove,
  UploadRemoveSuccess,
  UsageReport,
  UsageReportSuccess,
  UsageReportFailure,
  ListResponse,
  CARLink,
  PieceLink,
}

export interface ProgressStatus extends XHRProgressStatus {
  url?: string
}

export type ProgressFn = (status: ProgressStatus) => void

export interface Service {
  store: {
    add: ServiceMethod<StoreAdd, StoreAddSuccess, Failure>
    get: ServiceMethod<StoreGet, StoreGetSuccess, StoreGetFailure>
    remove: ServiceMethod<StoreRemove, StoreRemoveSuccess, StoreRemoveFailure>
    list: ServiceMethod<StoreList, StoreListSuccess, Failure>
  }
  upload: {
    add: ServiceMethod<UploadAdd, UploadAddSuccess, Failure>
    get: ServiceMethod<UploadGet, UploadGetSuccess, UploadGetFailure>
    remove: ServiceMethod<UploadRemove, UploadRemoveSuccess, Failure>
    list: ServiceMethod<UploadList, UploadListSuccess, Failure>
  }
  usage: {
    report: ServiceMethod<UsageReport, UsageReportSuccess, UsageReportFailure>
  }
}

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
   * Piece CID of the CAR file. Note: represents Piece link V2.
   *
   * @see https://github.com/filecoin-project/FIPs/pull/758/files
   */
  piece: PieceLink
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

export type DirectoryEntryLink =
  import('@ipld/unixfs/directory').DirectoryEntryLink

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
    UploadProgressTrackable {
  // whether the directory files have already been ordered in a custom way. indicates that the upload must not use a different order than the one provided.
  customOrder?: boolean
}

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
