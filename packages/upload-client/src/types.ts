import { Link, UnknownLink, Version } from 'multiformats/link'
import { Block } from '@ipld/unixfs'
import { CAR } from '@ucanto/transport'
import { ServiceMethod, ConnectionView, Signer, Proof } from '@ucanto/interface'
import {
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
} from '@web3-storage/access/capabilities/types'
import * as StoreCapabilities from '@web3-storage/access/capabilities/store'
import * as UploadCapabilities from '@web3-storage/access/capabilities/upload'

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

export type ServiceAbilities =
  | typeof StoreCapabilities.store.can
  | typeof StoreCapabilities.add.can
  | typeof StoreCapabilities.remove.can
  | typeof StoreCapabilities.list.can
  | typeof UploadCapabilities.upload.can
  | typeof UploadCapabilities.add.can
  | typeof UploadCapabilities.remove.can
  | typeof UploadCapabilities.list.can

export interface StoreAddResponse {
  status: string
  headers: Record<string, string>
  url: string
}

export interface ListResponse<R> {
  count: number
  page: number
  pageSize: number
  results?: R[]
}

export interface StoreListResult {
  payloadCID: CARLink
  size: number
  uploadedAt: number
}

export interface UploadListResult {
  carCID: CARLink
  dataCID: Link<unknown, number, number, Version>
  uploadedAt: number
}

export interface InvocationConfig {
  /**
   * Signing authority that is issuing the UCAN invocations.
   */
  issuer: Signer
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

export type RequestOptions = Retryable & Abortable & Connectable

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
