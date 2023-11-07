import { type Driver } from './driver/types.js'
import {
  type Service as AccessService,
  type AgentDataExport,
} from './agent/types.js'
import { type Service as UploadService } from './capability/upload/types.js'
import type {
  ConnectionView,
  Signer,
  DID,
  Ability,
  Resource,
  Unit,
} from '@ucanto/interface'
export type { UTCUnixTimestamp } from '@ipld/dag-ucan'
import { type Client } from './client.js'
export * from '@ucanto/interface'
export * from '@web3-storage/did-mailto'
export type {
  Agent,
  CapabilityQuery,
  BytesDelegation,
  SpaceInfoResult,
  EncodedDelegation,
} from './agent/types.js'

export * from './capability/upload/types.js'
export * from './agent/types.js'
export type { DelegationOptions } from './agent/types.js'

export type {
  Access,
  AccountDID,
  ProviderDID,
  SpaceDID,
  UCANRevoke,
  UCANRevokeSuccess,
  UCANRevokeFailure,
} from './agent/types.js'

export type { Service as UploadService } from './capability/upload/types.js'
export type { Service as AccessService } from './agent/types.js'

export type Service = AccessService & UploadService

export type ProofQuery = Record<Resource, Record<Ability, Unit>>

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
  /**
   * Use this principal to sign UCANs. Note: if the store is non-empty and the
   * principal saved in the store is not the same principal as the one passed
   * here an error will be thrown.
   */
  principal?: Signer<DID<'key'>>
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
} from './agent/types.js'

export type {
  StoreAddSuccess,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  StoreListSuccess,
  UploadAddSuccess,
  UploadRemoveSuccess,
  UploadListSuccess,
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
} from './capability/upload/types.js'
