import { type Driver } from '@web3-storage/access/drivers/types'
import {
  AccessDelegate,
  AccessDelegateFailure,
  AccessDelegateSuccess,
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
  ServiceMethod,
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
  OwnedSpace,
  SharedSpace,
} from '@web3-storage/access/types'

export type ProofQuery = Record<Resource, Record<Ability, Unit>>

export type Service = AccessService & UploadService & StorefrontService

export interface ServiceConf {
  access: ConnectionView<AccessService>
  upload: ConnectionView<UploadService>
  filecoin: ConnectionView<StorefrontService>
}

export interface ContentServeService {
  access: {
    delegate: ServiceMethod<
      AccessDelegate,
      AccessDelegateSuccess,
      AccessDelegateFailure
    >
  }
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
  ServiceAbility,
  BlobAdd,
  BlobList,
  BlobRemove,
  StoreAdd,
  StoreList,
  StoreRemove,
  UploadAdd,
  UploadList,
  UploadRemove,
  PlanGet,
  PlanGetSuccess,
  PlanGetFailure,
  PlanSet,
  PlanSetSuccess,
  PlanSetFailure,
  PlanCreateAdminSession,
  PlanCreateAdminSessionSuccess,
  PlanCreateAdminSessionFailure,
  FilecoinOffer,
  FilecoinOfferSuccess,
  FilecoinOfferFailure,
  FilecoinSubmit,
  FilecoinSubmitSuccess,
  FilecoinSubmitFailure,
  FilecoinAccept,
  FilecoinAcceptSuccess,
  FilecoinAcceptFailure,
  FilecoinInfo,
  FilecoinInfoSuccess,
  FilecoinInfoFailure,
} from '@web3-storage/capabilities/types'

export type {
  AgentDataModel,
  AgentDataExport,
  AgentMeta,
  DelegationMeta,
} from '@web3-storage/access/types'

export type {
  BlobAddSuccess,
  BlobAddFailure,
  BlobListSuccess,
  BlobListFailure,
  BlobRemoveSuccess,
  BlobRemoveFailure,
  IndexAddSuccess,
  IndexAddFailure,
  StoreAddSuccess,
  StoreGetSuccess,
  StoreGetFailure,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  StoreListSuccess,
  UploadAddSuccess,
  UploadGetSuccess,
  UploadGetFailure,
  UploadRemoveSuccess,
  UploadListSuccess,
  UploadListItem,
  UsageReportSuccess,
  UsageReportFailure,
  EgressData,
  EgressRecord,
  EgressRecordSuccess,
  EgressRecordFailure,
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
  UploadFileOptions,
  UploadDirectoryOptions,
  FileLike,
  BlobLike,
  ProgressStatus,
} from '@web3-storage/upload-client/types'
