import type { ListResponse, UploadListResult, Service } from '@web3-storage/upload-client/types'
import { ConnectionView, Principal } from '@ucanto/interface'

export { list } from '@web3-storage/upload-client/upload'

export type { ListResponse, UploadListResult, Service }

export interface ServiceConfig {
  servicePrincipal?: Principal
  connection?: ConnectionView<Service>
}

export interface UploadsListContextState {
  /**
   * True if the uploads list is currently being retrieved from the service.
   */
  loading: boolean
  /**
   * Set if an error occurred retrieving the uploads list.
   */
  error?: Error
  /**
   * The content of the uploads list.
   */
  data?: UploadListResult[]
}

export interface UploadsListContextActions {
  /**
   * Load the next page of results.
   */
  next: () => Promise<void>
  /**
   * Call to reload the uploads list (discarding the current page).
   */
  reload: () => Promise<void>
}
