import { type Driver } from '@web3-storage/access/drivers/types'
import {
  type Service as AccessService,
  type AgentDataExport,
} from '@web3-storage/access/types'
import { type Service as UploadService } from '@web3-storage/upload-client/types'
import type {
  ConnectionView,
  Signer,
  DID,
  Ability,
  Resource,
  Unit,
} from '@ucanto/interface'
import { type Client } from './client.js'
import { StorefrontService } from '@web3-storage/filecoin-client/storefront'
export * from '@ucanto/interface'
export * from '@web3-storage/did-mailto'
export type { Agent, CapabilityQuery } from '@web3-storage/access/agent'
export type {
  Access,
  AccountDID,
  ProviderDID,
  SpaceDID,
} from '@web3-storage/access/types'

export type ProofQuery = Record<Resource, Record<Ability, Unit>>

export interface ServiceConf {
  access: ConnectionView<AccessService>
  upload: ConnectionView<UploadService>
  filecoin: ConnectionView<StorefrontService>
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
  /**
   * Use this principal to sign UCANs. Note: if the store is non-empty and the
   * principal saved in the store is not the same principal as the one passed
   * here an error will be thrown.
   */
  principal?: Signer<DID<'key'>>
  /**
   * URL configuration of endpoint where receipts from UCAN Log can be read from.
   */
  receiptsEndpoint?: URL
}

export type ClientFactory = (options?: ClientFactoryOptions) => Promise<Client>

export { Client } from './client.js'

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
  ConnectionView,
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
  DelegationMeta,
} from '@web3-storage/access/types'

export type {
  StoreAddSuccess,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  StoreListSuccess,
  UploadAddSuccess,
  UploadRemoveSuccess,
  UploadListSuccess,
  UsageReportSuccess,
  UsageReportFailure,
  ListResponse,
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
  UploadDirectoryOptions,
  FileLike,
  BlobLike,
} from '@web3-storage/upload-client/types'
