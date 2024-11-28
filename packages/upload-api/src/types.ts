import type {
  Failure,
  ServiceMethod,
  UCANLink,
  Link,
  HandlerExecutionError,
  Signer,
  DID,
  DIDKey,
  InboundCodec,
  Result,
  CapabilityParser,
  Match,
  ParsedCapability,
  InferInvokedCapability,
  RevocationChecker,
  ToString,
  UnknownLink,
  MultihashDigest,
  Unit,
  AgentMessage,
  Invocation,
  Receipt,
  AgentMessageModel,
  UCAN,
  Capability,
  ReceiptModel,
  Variant,
  HTTPRequest,
  HTTPResponse,
} from '@ucanto/interface'
import type { ProviderInput, ConnectionView } from '@ucanto/server'

import { StorefrontService } from '@web3-storage/filecoin-api/types'
import { ServiceContext as FilecoinServiceContext } from '@web3-storage/filecoin-api/storefront/api'
import { DelegationsStorage as Delegations } from './types/delegations.js'
import { ProvisionsStorage as Provisions } from './types/provisions.js'
import { RateLimitsStorage as RateLimits } from './types/rate-limits.js'

export type ValidationEmailSend = {
  to: string
  url: string
}

export type SpaceDID = DIDKey
export type ServiceDID = DID<'web'>
export type ServiceSigner = Signer<ServiceDID>
export interface SpaceProviderRegistry {
  hasStorageProvider(space: SpaceDID): Promise<Result<boolean, never>>
}

export interface InsufficientStorage extends Failure {
  name: 'InsufficientStorage'
}

export type AllocationError = InsufficientStorage

export interface Email {
  sendValidation: (input: { to: string; url: string }) => Promise<void>
}

export interface DebugEmail extends Email {
  emails: Array<ValidationEmailSend>
  take: () => Promise<ValidationEmailSend>
}

import {
  BlobAdd,
  BlobAddSuccess,
  BlobAddFailure,
  BlobList,
  BlobListSuccess,
  BlobListFailure,
  BlobRemove,
  BlobRemoveSuccess,
  BlobRemoveFailure,
  BlobGet,
  BlobGetSuccess,
  BlobGetFailure,
  BlobAllocate,
  BlobAllocateSuccess,
  BlobAllocateFailure,
  BlobAccept,
  BlobAcceptSuccess,
  BlobAcceptFailure,
  StoreAdd,
  StoreGet,
  StoreAddSuccess,
  StoreRemove,
  StoreRemoveSuccess,
  StoreRemoveFailure,
  StoreList,
  StoreListSuccess,
  StoreListItem,
  UploadAdd,
  UploadGet,
  UploadAddSuccess,
  UploadRemove,
  UploadRemoveSuccess,
  UploadList,
  UploadListSuccess,
  UploadListItem,
  AccessAuthorize,
  AccessAuthorizeSuccess,
  AccessDelegate,
  AccessDelegateFailure,
  AccessDelegateSuccess,
  AccessClaim,
  AccessClaimSuccess,
  AccessClaimFailure,
  AccessConfirm,
  AccessConfirmSuccess,
  AccessConfirmFailure,
  ConsumerHas,
  ConsumerHasSuccess,
  ConsumerHasFailure,
  ConsumerGet,
  ConsumerGetSuccess,
  ConsumerGetFailure,
  CustomerGet,
  CustomerGetSuccess,
  CustomerGetFailure,
  SubscriptionGet,
  SubscriptionGetSuccess,
  SubscriptionGetFailure,
  SubscriptionList,
  SubscriptionListSuccess,
  SubscriptionListFailure,
  RateLimitAdd,
  RateLimitAddSuccess,
  RateLimitAddFailure,
  RateLimitRemove,
  RateLimitRemoveSuccess,
  RateLimitRemoveFailure,
  RateLimitList,
  RateLimitListSuccess,
  RateLimitListFailure,
  AdminStoreInspect,
  AdminStoreInspectSuccess,
  AdminStoreInspectFailure,
  AdminUploadInspect,
  AdminUploadInspectSuccess,
  AdminUploadInspectFailure,
  ProviderAdd,
  ProviderAddSuccess,
  ProviderAddFailure,
  SpaceInfo,
  ProviderDID,
  StoreGetFailure,
  UploadGetFailure,
  ListResponse,
  CARLink,
  StoreGetSuccess,
  UploadGetSuccess,
  UCANConclude,
  UCANConcludeSuccess,
  UCANConcludeFailure,
  UCANRevoke,
  UCANRevokeSuccess,
  UCANRevokeFailure,
  PlanGet,
  PlanGetSuccess,
  PlanGetFailure,
  AccessAuthorizeFailure,
  UsageReportSuccess,
  UsageReportFailure,
  UsageReport,
  PlanSetSuccess,
  PlanSetFailure,
  PlanSet,
  PlanCreateAdminSession,
  PlanCreateAdminSessionSuccess,
  PlanCreateAdminSessionFailure,
  IndexAdd,
  IndexAddSuccess,
  IndexAddFailure,
} from '@web3-storage/capabilities/types'
import * as Capabilities from '@web3-storage/capabilities'
import { RevocationsStorage } from './types/revocations.js'

export * from '@web3-storage/capabilities/types'
export * from '@ucanto/interface'

export type { ProvisionsStorage, Provision } from './types/provisions.js'
export type {
  DelegationsStorage,
  Query as DelegationsStorageQuery,
} from './types/delegations.js'
export type {
  Revocation,
  RevocationQuery,
  MatchingRevocations,
  RevocationsStorage,
} from './types/revocations.js'
export type { RateLimitsStorage, RateLimit } from './types/rate-limits.js'
import { PlansStorage } from './types/plans.js'
export type { PlansStorage } from './types/plans.js'
import { SubscriptionsStorage } from './types/subscriptions.js'
export type { SubscriptionsStorage }
import { UsageStorage } from './types/usage.js'
export type { UsageStorage }
import { StorageGetError } from './types/storage.js'
import { AllocationsStorage, BlobsStorage, BlobAddInput } from './types/blob.js'
export type { AllocationsStorage, BlobsStorage, BlobAddInput }
import { IPNIService, IndexServiceContext } from './types/index.js'
import { ClaimsClientConfig, ClaimsClientContext } from './types/content-claims.js'
import { Claim } from '@web3-storage/content-claims/client/api'
export type {
  IndexServiceContext,
  IPNIService,
  BlobRetriever,
  BlobNotFound,
  ShardedDAGIndex,
} from './types/index.js'
export type {
  ClaimsInvocationConfig,
  ClaimsClientConfig,
  ClaimsClientContext,
  Service as ClaimsService,
} from './types/content-claims.js'

export interface Service extends StorefrontService, W3sService {
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
  console: {
    log: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.log>,
      Unit,
      never
    >
    error: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.error>,
      never,
      Failure & { cause: unknown }
    >
  }
  access: {
    authorize: ServiceMethod<
      AccessAuthorize,
      AccessAuthorizeSuccess,
      AccessAuthorizeFailure
    >
    claim: ServiceMethod<AccessClaim, AccessClaimSuccess, AccessClaimFailure>
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
  consumer: {
    has: ServiceMethod<ConsumerHas, ConsumerHasSuccess, ConsumerHasFailure>
    get: ServiceMethod<ConsumerGet, ConsumerGetSuccess, ConsumerGetFailure>
  }
  customer: {
    get: ServiceMethod<CustomerGet, CustomerGetSuccess, CustomerGetFailure>
  }
  subscription: {
    get: ServiceMethod<
      SubscriptionGet,
      SubscriptionGetSuccess,
      SubscriptionGetFailure
    >
    list: ServiceMethod<
      SubscriptionList,
      SubscriptionListSuccess,
      SubscriptionListFailure
    >
  }
  'rate-limit': {
    add: ServiceMethod<RateLimitAdd, RateLimitAddSuccess, RateLimitAddFailure>
    remove: ServiceMethod<
      RateLimitRemove,
      RateLimitRemoveSuccess,
      RateLimitRemoveFailure
    >
    list: ServiceMethod<
      RateLimitList,
      RateLimitListSuccess,
      RateLimitListFailure
    >
  }

  ucan: {
    conclude: ServiceMethod<
      UCANConclude,
      UCANConcludeSuccess,
      UCANConcludeFailure
    >
    revoke: ServiceMethod<UCANRevoke, UCANRevokeSuccess, UCANRevokeFailure>
  }

  admin: {
    store: {
      inspect: ServiceMethod<
        AdminStoreInspect,
        AdminStoreInspectSuccess,
        AdminStoreInspectFailure
      >
    }
    upload: {
      inspect: ServiceMethod<
        AdminUploadInspect,
        AdminUploadInspectSuccess,
        AdminUploadInspectFailure
      >
    }
  }
  provider: {
    add: ServiceMethod<ProviderAdd, ProviderAddSuccess, ProviderAddFailure>
  }
  space: {
    info: ServiceMethod<SpaceInfo, SpaceInfoSuccess, SpaceInfoFailure>
    index: {
      add: ServiceMethod<IndexAdd, IndexAddSuccess, IndexAddFailure>
    }
    blob: {
      add: ServiceMethod<BlobAdd, BlobAddSuccess, BlobAddFailure>
      remove: ServiceMethod<BlobRemove, BlobRemoveSuccess, BlobRemoveFailure>
      list: ServiceMethod<BlobList, BlobListSuccess, BlobListFailure>
      get: {
        0: {
          1: ServiceMethod<BlobGet, BlobGetSuccess, BlobGetFailure>
        }
      }
    }
  }
  plan: {
    get: ServiceMethod<PlanGet, PlanGetSuccess, PlanGetFailure>
    set: ServiceMethod<PlanSet, PlanSetSuccess, PlanSetFailure>
    'create-admin-session': ServiceMethod<
      PlanCreateAdminSession,
      PlanCreateAdminSessionSuccess,
      PlanCreateAdminSessionFailure
    >
  }
  usage: {
    report: ServiceMethod<UsageReport, UsageReportSuccess, UsageReportFailure>
  }
}

export interface W3sService {
  ['web3.storage']: {
    blob: {
      allocate: ServiceMethod<
        BlobAllocate,
        BlobAllocateSuccess,
        BlobAllocateFailure
      >
      accept: ServiceMethod<BlobAccept, BlobAcceptSuccess, BlobAcceptFailure>
    }
  }
}

export type BlobServiceContext = SpaceServiceContext & ClaimsClientContext & {
  /**
   * Service signer
   */
  id: Signer
  maxUploadSize: number
  allocationsStorage: AllocationsStorage
  blobsStorage: BlobsStorage
  agentStore: AgentStore
  getServiceConnection: () => ConnectionView<Service>
}

export type W3ServiceContext = SpaceServiceContext & ClaimsClientContext & {
  /**
   * Service signer
   */
  id: Signer
  allocationsStorage: AllocationsStorage
  blobsStorage: BlobsStorage
}

export type StoreServiceContext = SpaceServiceContext & {
  maxUploadSize: number
  storeTable: StoreTable
  carStoreBucket: CarStoreBucket
}

export type UploadServiceContext = ConsumerServiceContext &
  SpaceServiceContext &
  RevocationServiceContext &
  ConcludeServiceContext & {
    signer: Signer
    uploadTable: UploadTable
  }

export interface AccessClaimContext {
  signer: Signer
  delegationsStorage: Delegations
}

export interface AccessServiceContext extends AccessClaimContext, AgentContext {
  email: Email
  url: URL
  provisionsStorage: Provisions
  rateLimitsStorage: RateLimits
}

export interface ConsumerServiceContext {
  signer: Signer
  provisionsStorage: Provisions
}

export interface CustomerServiceContext {
  signer: Signer
  provisionsStorage: Provisions
}

export interface AdminServiceContext {
  signer: Signer
  uploadTable: UploadTable
  storeTable: StoreTable
}

export interface ConsoleServiceContext {}

export interface SpaceServiceContext extends AgentContext {
  provisionsStorage: Provisions
  delegationsStorage: Delegations
  rateLimitsStorage: RateLimits
}

export interface ProviderServiceContext {
  provisionsStorage: Provisions
  rateLimitsStorage: RateLimits
  plansStorage: PlansStorage
  requirePaymentPlan?: boolean
}

export interface SubscriptionServiceContext {
  signer: Signer
  provisionsStorage: Provisions
  subscriptionsStorage: SubscriptionsStorage
}

export interface RateLimitServiceContext {
  rateLimitsStorage: RateLimits
}

export interface RevocationServiceContext {
  revocationsStorage: RevocationsStorage
}

export interface ConcludeServiceContext {
  /**
   * Service signer
   */
  id: Signer

  /**
   * Store for invocations & receipts.
   */
  agentStore: AgentStore

  getServiceConnection: () => ConnectionView<Service>
}

export interface PlanServiceContext {
  plansStorage: PlansStorage
}

export interface UsageServiceContext {
  provisionsStorage: Provisions
  usageStorage: UsageStorage
}

export interface ServiceContext
  extends AgentContext,
    AccessServiceContext,
    ConsoleServiceContext,
    ConsumerServiceContext,
    CustomerServiceContext,
    ProviderServiceContext,
    SpaceServiceContext,
    StoreServiceContext,
    BlobServiceContext,
    ConcludeServiceContext,
    SubscriptionServiceContext,
    RateLimitServiceContext,
    RevocationServiceContext,
    PlanServiceContext,
    UploadServiceContext,
    FilecoinServiceContext,
    IndexServiceContext,
    UsageServiceContext {}

export interface UcantoServerContext extends ServiceContext, RevocationChecker {
  id: Signer
  codec?: InboundCodec
  errorReporter: ErrorReporter
}

export interface AgentContext {
  agentStore: AgentStore
}

/**
 * An agent store used for storing ucanto {@link AgentMessage}s and
 * {@link Invocation} and {@link Receipt} lookups.
 */
export interface AgentStore {
  messages: Writer<ParsedAgentMessage>
  invocations: Accessor<UnknownLink, Invocation>
  receipts: Accessor<UnknownLink, Receipt>
}

export type TaskLink = Link

export type InvocationLink = Link<UCAN.UCAN<[Capability]>>
export type ReceiptLink = Link<ReceiptModel>
export type AgentMessageLink = Link<AgentMessageModel<unknown>>

export interface ParsedAgentMessage {
  source: HTTPRequest | HTTPResponse
  data: AgentMessage
  index: Iterable<AgentMessageIndexRecord>
}

export interface InvocationSource {
  task: TaskLink
  invocation: Invocation
  message: AgentMessageLink
}

export interface ReceiptSource {
  task: TaskLink
  receipt: Receipt
  message: AgentMessageLink
}

export type AgentMessageIndexRecord = Variant<{
  invocation: InvocationSource
  receipt: ReceiptSource
}>

/**
 * Read interface for the key value store.
 */
export interface Accessor<Key, Value> {
  get(key: Key): Promise<Result<Value, StorageGetError>>
}

/**
 * Write interface of some values.
 */
export interface Writer<Value> {
  write(value: Value): Promise<Result<Unit, WriteError<Value>>>
}

export interface NotFoundError {
  name: 'NotFoundError'
  key: unknown
}

export interface WriteError<Payload = unknown> extends Failure {
  name: 'WriteError'

  /**
   * Payload writing which caused an error.
   */
  payload: Payload
  /**
   * Destination writing into which caused an error.
   */
  writer: Writer<Payload>
}

export interface UcantoServerTestContext
  extends UcantoServerContext,
    StoreTestContext,
    BlobServiceContext,
    UploadTestContext {
  connection: ConnectionView<Service>
  mail: DebugEmail
  service: Signer<ServiceDID>
  fetch: typeof fetch

  grantAccess: (mail: { url: string | URL }) => Promise<void>

  ipniService: IPNIService & {
    query(digest: MultihashDigest): Promise<Result<Unit, RecordNotFound>>
  }

  carStoreBucket: CarStoreBucket & Deactivator
  blobsStorage: BlobsStorage & Deactivator
  claimsService: ClaimsClientConfig & ClaimReader & Deactivator
}

export interface ClaimReader {
  read(digest: MultihashDigest): Promise<Result<Claim[], Failure>>
}

export interface Deactivator {
  deactivate: () => Promise<void>
}

export interface StoreTestContext {}

export interface UploadTestContext {}

export interface ErrorReporter {
  catch: (error: HandlerExecutionError | WriteError) => void
}

export interface CarStoreBucket {
  has: (link: UnknownLink) => Promise<boolean>
  createUploadUrl: (
    link: UnknownLink,
    size: number
  ) => Promise<{
    url: URL
    headers: {
      'x-amz-checksum-sha256': string
      'content-length': string
    } & Record<string, string>
  }>
}

export interface CarStoreBucketOptions {
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
  bucket?: string
  sessionToken?: string
  expires?: number
}

export interface CarStoreBucketService {
  use(options?: CarStoreBucketOptions): Promise<CarStoreBucket>
}

/**
 * Indicates the requested record was not present in the table.
 */
export interface RecordNotFound extends Failure {
  name: 'RecordNotFound'
}

/**
 * Indicates the inserted record key conflicts with an existing key of a record
 * that already exists in the table.
 */
export interface RecordKeyConflict extends Failure {
  name: 'RecordKeyConflict'
}

export interface StoreTable {
  inspect: (link: UnknownLink) => Promise<Result<StoreInspectSuccess, Failure>>
  exists: (space: DID, link: UnknownLink) => Promise<Result<boolean, Failure>>
  get: (
    space: DID,
    link: UnknownLink
  ) => Promise<Result<StoreGetSuccess, RecordNotFound>>
  /** Inserts an item in the table if it does not already exist. */
  insert: (
    item: StoreAddInput
  ) => Promise<Result<StoreAddOutput, RecordKeyConflict>>
  /** Removes an item from the table but fails if the item does not exist. */
  remove: (
    space: DID,
    link: UnknownLink
  ) => Promise<Result<StoreRemoveSuccess, RecordNotFound>>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<Result<ListResponse<StoreListItem>, Failure>>
}

export interface UploadTable {
  inspect: (link: UnknownLink) => Promise<Result<UploadInspectSuccess, Failure>>
  exists: (space: DID, root: UnknownLink) => Promise<Result<boolean, Failure>>
  get: (
    space: DID,
    link: UnknownLink
  ) => Promise<Result<UploadGetSuccess, RecordNotFound>>
  /**
   * Inserts an item in the table if it does not already exist or updates an
   * existing item if it does exist.
   */
  upsert: (item: UploadAddInput) => Promise<Result<UploadAddSuccess, Failure>>
  /** Removes an item from the table but fails if the item does not exist. */
  remove: (
    space: DID,
    root: UnknownLink
  ) => Promise<Result<UploadRemoveSuccess, RecordNotFound>>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<Result<ListResponse<UploadListItem>, Failure>>
}

export type SpaceInfoSuccess = {
  did: SpaceDID
  providers: ProviderDID[]
}
export type SpaceInfoFailure = Failure | SpaceUnknown

export interface UnknownProvider extends Failure {
  name: 'UnknownProvider'
}
export type CustomerGetResult = Result<CustomerGetSuccess, CustomerGetFailure>
export type SubscriptionGetResult = Result<
  SubscriptionGetSuccess,
  SubscriptionGetFailure
>
export type AdminStoreInspectResult = Result<
  AdminStoreInspectSuccess,
  AdminStoreInspectFailure
>
export type AdminUploadInspectResult = Result<
  AdminUploadInspectSuccess,
  AdminUploadInspectFailure
>

export interface StoreAddInput {
  space: DID
  link: CARLink
  size: number
  origin?: UnknownLink

  /**
   * @deprecated - Issuer of the invocation is irrelevant as long as
   * they have authorization to invoke on subject `space`.
   */
  issuer?: DID
  invocation: UCANLink
}

export interface StoreAddOutput
  extends Omit<StoreAddInput, 'space' | 'issuer' | 'invocation'> {}

export interface StoreInspectSuccess {
  spaces: Array<{ did: DID; insertedAt: string }>
}

export interface UploadAddInput {
  space: DID
  root: UnknownLink
  shards?: CARLink[]
  issuer: DID
  invocation: UCANLink
}

export interface UploadInspectSuccess {
  spaces: Array<{ did: DID; insertedAt: string }>
}

export interface ListOptions {
  size?: number
  cursor?: string
  pre?: boolean
}

export interface TestSpaceRegistry {
  /**
   * Registers space with the registry.
   */
  registerSpace: (space: DID) => Promise<void>
}

export interface LinkJSON<T extends UnknownLink = UnknownLink> {
  '/': ToString<T>
}
export interface SpaceUnknown extends Failure {
  name: 'SpaceUnknown'
}

export type Input<C extends CapabilityParser<Match<ParsedCapability>>> =
  ProviderInput<InferInvokedCapability<C> & ParsedCapability>

export interface Assert {
  equal: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  deepEqual: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  ok: <Actual>(actual: Actual, message?: string) => unknown
}

export type Test = (assert: Assert, context: UcantoServerTestContext) => unknown
export type Tests = Record<string, Test>
