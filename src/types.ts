import { Driver } from '@web3-storage/access/drivers/types'
import { Service as AccessService, AgentDataExport } from '@web3-storage/access/types'
import { Service as UploadService } from '@web3-storage/upload-client/types'
import { ConnectionView } from '@ucanto/interface'
import { Client } from './client'

export interface ServiceConf {
  access: ConnectionView<AccessService>
  upload: ConnectionView<UploadService>
}

export interface ClientFactoryOptions {
  /**
   * A storage driver that persists exported agent data.
   */
  store?: Driver<AgentDataExport>
  /**
   * Service DID and URL configuration.
   */
  serviceConf?: ServiceConf
}

export interface ClientFactory {
  (options?: ClientFactoryOptions): Promise<Client>
}

export { Client } from './client'

export type { UnknownLink } from 'multiformats'

export type { 
  DID,
  Principal,
  Delegation,
  Ability,
  Capability,
  Capabilities,
  UCANOptions,
  UCANBlock,
  Block,
  ConnectionView
} from '@ucanto/interface'

export type {
  Abilities,
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
} from '@web3-storage/capabilities/types'

export type {
  AgentDataModel,
  AgentDataExport,
  AgentMeta,
  DelegationMeta
} from '@web3-storage/access/types'

export type {
  StoreAddResponse,
  UploadAddResponse,
  ListResponse,
  StoreListResult,
  UploadListResult,
  AnyLink,
  CARLink,
  CARFile,
  CARMetadata,
  Retryable,
  Abortable,
  Connectable,
  Pageable,
  RequestOptions,
  ListRequestOptions,
  ShardingOptions,
  ShardStoringOptions,
  UploadOptions,
  FileLike,
  BlobLike
} from '@web3-storage/upload-client/types'
