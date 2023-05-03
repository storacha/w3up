import type { CARMetadata, Service, ProgressFn, ProgressStatus, FetchOptions } from '@web3-storage/upload-client/types'
import type { ConnectionView, Principal } from '@ucanto/interface'

import { Link, Version } from 'multiformats'

export { uploadFile, uploadDirectory } from '@web3-storage/upload-client'

export type { CARMetadata, Service, ProgressFn, ProgressStatus, FetchOptions }

export type UploadProgress = Record<string, ProgressStatus>

export type CID = Link<unknown, number, number, Version>
export interface UploaderContextState {
  storedDAGShards: CARMetadata[]
  uploadProgress: UploadProgress
}

export interface ServiceConfig {
  servicePrincipal?: Principal
  connection?: ConnectionView<Service>
}

export interface UploaderContextActions {
  /**
   * Upload a single file to the current space.
   */
  uploadFile: (file: Blob) => Promise<CID>
  /**
   * Upload a directory of files to the current space.
   */
  uploadDirectory: (
    files: File[]
  ) => Promise<CID>
}
