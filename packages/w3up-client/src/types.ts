import { type Driver } from '@web3-storage/access/drivers/types'
import { type Service as UploadService } from '@web3-storage/upload-client/types'
import { Querier, Transactor } from 'datalogia'

export type { Querier, Transactor }
import type {
  ConnectionView,
  Signer,
  DID,
  Ability,
  Resource,
  Unit,
  Phantom,
  Principal,
  Capabilities,
  Delegation,
  Fact,
  SignerArchive,
  ServiceMethod,
  SigAlg,
  Link,
  ToString,
  Failure,
  Caveats,
  UnknownMatch,
  Match,
  CapabilityParser,
  InferInvokedCapability,
  Variant,
  Result,
  IPLDBlock,
  DIDKey,
  Protocol,
} from '@ucanto/interface'

import type {
  Abilities,
  AccessAuthorize,
  AccessAuthorizeSuccess,
  AccessAuthorizeFailure,
  AccessClaim,
  AccessClaimSuccess,
  AccessClaimFailure,
  AccessConfirm,
  AccessConfirmSuccess,
  AccessConfirmFailure,
  AccessDelegate,
  AccessDelegateSuccess,
  AccessDelegateFailure,
  ProviderAdd,
  ProviderAddSuccess,
  ProviderAddFailure,
  SpaceInfo,
  SubscriptionList,
  SubscriptionListSuccess,
  SubscriptionListFailure,
  PlanGet,
  PlanGetSuccess,
  PlanGetFailure,
  UCANRevoke,
  UCANRevokeSuccess,
  UCANRevokeFailure,
} from '@web3-storage/capabilities'
import { type Client } from './client.js'
import { StorefrontService } from '@web3-storage/filecoin-client/storefront'
import exp from 'constants'
import { CID } from 'multiformats'
import { Block } from '@ipld/car/buffer-reader'

export * from '@ipld/dag-ucan'
export * from '@ucanto/interface'
export * from '@web3-storage/did-mailto'
export * from '@web3-storage/capabilities'

// specify exact exports to avoid ambiguity
export type {
  Link,
  Signer,
  Await,
  Tuple,
  Verifier,
  ToString,
  View,
} from '@ucanto/interface'
export type { UCAN } from '@web3-storage/capabilities'

export type { Driver as Storage }

export type ProofQuery = Record<Resource, Record<Ability, Unit>>

/**
 * Indicates failure executing ability that requires access to a space that is not well-known enough to be handled.
 * e.g. it's a space that's never been seen before,
 * or it's a seen space that hasn't been fully registered such that the service can serve info about the space.
 */
export interface SpaceUnknown extends Failure {
  name: 'SpaceUnknown'
}

export interface SpaceInfoResult {
  // space did
  did: DID<'key'>
  providers: Array<DID<'web'>>
}

export interface UCANProtocol {
  ucan: {
    revoke: ServiceMethod<UCANRevoke, UCANRevokeSuccess, UCANRevokeFailure>
  }
}

/**
 * Access api service definition type
 */
export interface AccessService extends UCANProtocol {
  access: {
    authorize: ServiceMethod<
      AccessAuthorize,
      AccessAuthorizeSuccess,
      AccessAuthorizeFailure
    >
    claim: ServiceMethod<AccessClaim, AccessClaimSuccess, AccessClaimFailure>
    // eslint-disable-next-line @typescript-eslint/ban-types
    confirm: ServiceMethod<
      AccessConfirm,
      AccessConfirmSuccess,
      AccessConfirmFailure
    >
    delegate: ServiceMethod<
      AccessDelegate,
      AccessDelegateSuccess,
      AccessDelegateFailure
    >
  }
  provider: {
    add: ServiceMethod<ProviderAdd, ProviderAddSuccess, ProviderAddFailure>
  }
  space: {
    info: ServiceMethod<SpaceInfo, SpaceInfoResult, Failure | SpaceUnknown>
  }
  subscription: {
    list: ServiceMethod<
      SubscriptionList,
      SubscriptionListSuccess,
      SubscriptionListFailure
    >
  }

  plan: {
    get: ServiceMethod<PlanGet, PlanGetSuccess, PlanGetFailure>
  }
}

export type { StorefrontService, UploadService }
export type Service = AccessService & UploadService & StorefrontService

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
  PlanGet,
  PlanGetSuccess,
  PlanGetFailure,
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
  ProgressStatus,
} from '@web3-storage/upload-client/types'

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export type BytesDelegation<C extends Capabilities = Capabilities> =
  Uint8Array & Phantom<Delegation<C>>

export type ResourceQuery = Resource | RegExp

/**
 * Agent class types
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AgentOptions<S extends Record<string, any>> {
  url?: URL
  connection?: ConnectionView<S>
  servicePrincipal?: Principal
  receiptsEndpoint?: URL
}

export interface AgentDataOptions {
  store?: Driver<AgentDataExport>
}

/**
 * Space metadata
 */
export interface SpaceMeta {
  /**
   * Human readable name for the space
   */
  name: string
}

/**
 * Agent metadata used to describe an agent ("audience")
 * with a more human and UI friendly data
 */
export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

/**
 * Utility types
 */

export interface UCANBasicOptions {
  /**
   * Audience Principal (DID),
   * Defaults to "Access service DID"
   *
   * @see {@link https://github.com/ucan-wg/spec#321-principals Spec}
   */
  audience?: Principal
  /**
   * UCAN lifetime in seconds
   */
  lifetimeInSeconds?: number
  /**
   * Unix timestamp when the UCAN is no longer valid
   *
   * Expiration overrides `lifetimeInSeconds`
   *
   * @see {@link https://github.com/ucan-wg/spec#322-time-bounds Spec}
   */
  expiration?: number
  /**
   * Unix timestamp when the UCAN becomas valid
   *
   * @see {@link https://github.com/ucan-wg/spec#322-time-bounds Spec}
   */
  notBefore?: number
  /**
   * Nonce, a randomly generated string, used to ensure the uniqueness of the UCAN.
   *
   * @see {@link https://github.com/ucan-wg/spec#323-nonce Spec}
   */
  nonce?: string
  /**
   * Facts, an array of extra facts or information to attach to the UCAN
   *
   * @see {@link https://github.com/ucan-wg/spec#324-facts Spec}
   */
  facts?: Fact[]
}

export type DelegateOptions = UCANBasicOptions & {
  audience: Principal
  /**
   * Abilities to delegate
   */
  abilities: Abilities[]
  /**
   * Metadata about the audience
   */
  audienceMeta: AgentMeta
}

export type InvokeOptions<
  A extends Ability,
  R extends Resource,
  CAP extends CapabilityParser<
    Match<{ can: A; with: R & Resource; nb: Caveats }, UnknownMatch>
  >
> = UCANBasicOptions &
  InferNb<InferInvokedCapability<CAP>['nb']> & {
    /**
     * Resource for the capability, normally a Space DID
     * Defaults to the current selected Space
     */
    with?: R

    /**
     * Extra proofs to be added to the invocation
     */
    proofs?: Delegation[]
  }

/**
 * Given an inferred capability infers if the nb field is optional or not
 */
export type InferNb<C extends Record<string, unknown> | undefined> =
  keyof C extends never
    ? {
        nb?: never
      }
    : {
        /**
         * Non-normative fields for the capability
         *
         * Check the capability definition for more details on the `nb` field.
         *
         * @see {@link https://github.com/ucan-wg/spec#241-nb-non-normative-fields Spec}
         */
        nb: C
      }

/**
 * Delegation metadata
 */
export interface DelegationMeta {
  /**
   * Audience metadata to be easier to build UIs with human readable data
   * Normally used with delegations issued to third parties or other devices.
   */
  audience?: AgentMeta
}

/**
 * Data schema used internally by the agent.
 */
export interface AgentDataModel {
  meta: AgentMeta
  principal: Signer<DID<'key'>>
  /** @deprecated */
  currentSpace?: DID<'key'>
  /** @deprecated */
  spaces: Map<DID, SpaceMeta>
  delegations: Map<CIDString, { meta: DelegationMeta; delegation: Delegation }>
}

/**
 * Agent data that is safe to pass to structuredClone() and persisted by stores.
 */
export type AgentDataExport = Pick<
  AgentDataModel,
  'meta' | 'currentSpace' | 'spaces'
> & {
  principal: SignerArchive<DID, SigAlg>
  delegations: Map<
    CIDString,
    {
      meta: DelegationMeta
      delegation: Array<{ cid: CIDString; bytes: Uint8Array }>
    }
  >
}

/**
 * Schema types
 *
 * Interfaces for data structures used in the client
 *
 */

export type CIDString = ToString<Link>

export interface CapabilityQuery {
  with: ResourceQuery
  can?: AbilityQuery
  nb?: unknown
}

export type AbilityQuery = Ability | RegExp

/**
 * Describes level of access to a resource.
 */
export type Access =
  // This complicates type workarounds the issue with TS which will would have
  // complained about missing `*` key if we have used `Record<Ability, Unit>`
  // instead.
  Record<Exclude<Ability, '*'>, Unit> & {
    ['*']?: Unit
  }

export type LikePattern = string

export type GlobPattern = string

export type TextConstraint =
  | Variant<{
      like: LikePattern
      glob: GlobPattern
      '=': string
    }>
  | (string & { like?: undefined; glob?: undefined; ['=']?: undefined })

/**
 * In the future, we want to implement AccessRequestSchema per spec, but for
 * now we do not support passing any clauses.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Clause = Variant<{}>

/**
 * Describes level of access to a resource.
 */
export type Can =
  // This complicates type workarounds the issue with TS which will would have
  // complained about missing `*` key if we have used `Record<Ability, Unit>`
  // instead.
  Record<Exclude<Ability, '*'>, Clause[]> & {
    ['*']?: Clause[]
  }

export type { Driver }

export interface DataStore extends Driver<DatabaseArchive> {}

export interface StoredDelegation {
  meta: DelegationMeta
  delegation: Delegation
}
export interface StoredProofs extends Map<CIDString, StoredDelegation> {}

/**
 * An {@link IPLDBlock} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 */
export interface BlockArchive {
  cid: CIDString
  bytes: Uint8Array
}

/**
 * A {@link API.Delegation} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 */
export interface DelegationArchive extends Array<BlockArchive> {}

/**
 * {@link StoredDelegation} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 */
export interface StoredDelegationArchive {
  meta: DelegationMeta
  delegation: DelegationArchive
}

/**
 * Snapshot of the agent database state that can be persisted into a store.
 */
export interface DatabaseArchive {
  meta?: AgentMeta
  principal?: SignerArchive
  delegations: Map<CIDString, StoredDelegationArchive>
}

/**
 * Database consists of `proofs` and an `index` of those proofs used for
 * querying. We may drop `proofs` in the future and persist `index` directly,
 * but right now we keep them both around.
 *
 * For legacy reason database also stores key material and an agent metadata.
 */
export interface Database {
  meta: AgentMeta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer?: SignerArchive<DID, any>
  proofs: StoredProofs

  index: Querier
  transactor: Transactor

  store?: DataStore
}

export interface Address<Protocol extends UnknownProtocol = UnknownProtocol>
  extends Phantom<Protocol> {
  id: Principal
  url: URL
}

export interface AddressArchive<
  Protocol extends UnknownProtocol = UnknownProtocol
> extends Phantom<Protocol> {
  id: DID
  url: ToString<URL>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UnknownProtocol extends Record<string, any> {}

export interface W3UpOpen {
  as?: Signer
  store: DataStore
}

export interface W3Load {
  as?: Signer
  store: DataStore
}

export interface W3Create {
  as?: Signer
  store: DataStore
}

export type W3From = Variant<{
  load: W3Load
  open: W3UpOpen
  create: W3Create
}>

/**
 * W3Up is the interface that main library module implements.
 */
export interface W3Up {
  /**
   * Restores an archived agent from the given {@link DataStore} or creates a
   * new one if storage contains no agent data yet. If optional {@link Signer}
   * is provided agent will act on its behalf, otherwise it will create a new
   * keypair and use it as the signing authority.
   *
   * If {@link Signer} is provided, it will attempt to load the keypair from the
   * store and if store does not contain a keypair, it will generate a new one
   * and store it in the store. If you do provide a {@link Signer} it will not
   * be persisted in the store.
   *
   * If {@link DataStore} is not provided, ephemeral agent is returned, meaning
   * no keypair or delegations will be persisted.
   *
   * If you want to restore archived agent without creating one you should use
   * the `load` method instead.
   */
  open(source: W3UpOpen): AgentView

  /**
   * Loads archived agent from the given {@link DataStore}. If optional
   * {@link Signer} is provided returned agent will act on its behalf, but
   * corresponding keypair will not be persisted in the agent store.
   *
   * If you do not pass a signer and one is not persisted in the store load will
   * fail.
   */
  load(source: W3Load): AgentView

  /**
   * Creates a new agent that will be persisted in the given {@link DataStore}.
   * If you do not pass an optional {@link Signer}, new one will be generated,
   * either way {@link Signer} will be persisted in the given store.
   *
   * If you want to create an ephemeral agent use `open` method without passing
   * the store.
   *
   * ⚠️ Please note that if store already contains a principal calling this
   * method will overwrite it.
   */
  create(source: W3Create): AgentView

  /**
   * General function that does `load`, `create` or `open` based on input.
   */
  from(source: W3From): AgentView
}

export interface Agent {
  signer: Signer
  db: Database
}

/**
 * Agent is effectively a signing authority coupled with a persisted or
 * ephemeral database of (UCAN) delegations. It can be used to query
 * capabilities or issue authorizations. It's primary use case is to
 * create sessions with service providers that can be used to invoke
 * provided capabilities on behalf of the signing authority.
 */
export interface AgentView {
  /**
   * Store used to persist agent delegations and signing authority.
   */
  db: Database

  did(): DID

  /**
   * Connects to a service provider and returns a session that can be used to
   * invoke capabilities provided by the service.
   */
  connect<Protocol extends UnknownProtocol = Service>(
    connection?: ConnectionView<Protocol>
  ): Promise<
    Result<
      Session<Protocol>,
      SignerLoadError | DataStoreOpenError | DataStoreSaveError
    >
  >
}

export type ConnectError =
  | SignerLoadError
  | DataStoreOpenError
  | DataStoreSaveError
  | DatabaseTransactionError

/**
 * Error occurs when session is loaded from session store that does not store
 * a principal.
 */
export interface SignerLoadError extends Failure {
  name: 'SignerLoadError'
}

export interface DataStoreOpenError extends Failure {
  name: 'DataStoreOpenError'
}

export interface DataStoreSaveError extends Failure {
  name: 'DataStoreSaveError'
}

export interface DatabaseTransactionError extends Failure {
  name: 'DatabaseTransactionError'
}

/**
 * Session an agent has with a service provider.
 */
export interface Session<Protocol extends UnknownProtocol = Service> {
  agent: AgentView
  connection: Connection<Protocol>
}

export interface Connection<Protocol extends UnknownProtocol = Service>
  extends ConnectionView<Protocol> {
  address: Address
}
