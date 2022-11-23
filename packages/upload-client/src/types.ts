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
} from '@web3-storage/access/capabilities/types'

export type {
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
}

export interface Service {
  store: {
    add: ServiceMethod<StoreAdd, StoreAddResponse, never>
    list: ServiceMethod<StoreList, ListResponse<StoreListResult>, never>
    remove: ServiceMethod<StoreRemove, null, never>
  }
  upload: {
    add: ServiceMethod<UploadAdd, null, never>
    list: ServiceMethod<UploadList, ListResponse<UploadListResult>, never>
    remove: ServiceMethod<UploadRemove, null, never>
  }
}

export interface StoreAddResponse {
  status: string
  headers: Record<string, string>
  url: string
}

export interface ListResponse<R> {
  cursor?: string
  size: number
  results: R[]
}

export interface StoreListResult {
  payloadCID: string
  origin?: string
  size: number
  uploadedAt: string
}

export interface UploadListResult {
  uploaderDID: string
  dataCID: string
  carCID: string
  uploadedAt: string
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
}

export interface RequestOptions extends Retryable, Abortable, Connectable {}

export interface ListRequestOptions extends RequestOptions, Pageable {}

export interface ShardingOptions {
  /**
   * The target shard size. Actual size of CAR output may be bigger due to CAR
   * header and block encoding data.
   */
  shardSize?: number
}

export interface UploadOptions extends RequestOptions, ShardingOptions {
  onShardStored?: (meta: CARMetadata) => void
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
