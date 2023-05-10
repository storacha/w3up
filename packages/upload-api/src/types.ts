import type {
  Failure,
  Invocation,
  ServiceMethod,
  UCANLink,
  HandlerExecutionError,
  Signer,
  DID,
  InboundCodec,
  Result,
  Unit,
  CapabilityParser,
  Match,
  ParsedCapability,
  InferInvokedCapability,
} from '@ucanto/interface'
import type { ProviderInput } from '@ucanto/server'

import { ToString, UnknownLink } from 'multiformats'

import {
  StoreAdd,
  StoreRemove,
  StoreList,
  UploadAdd,
  UploadRemove,
  UploadList,

} from '@web3-storage/capabilities/types'
import * as Capabilities from '@web3-storage/capabilities'

export * from '@web3-storage/capabilities/types'
export * from '@ucanto/interface'

export interface Service {
  store: {
    add: ServiceMethod<StoreAdd, StoreAddOk, Failure>
    remove: ServiceMethod<StoreRemove, Unit, Failure>
    list: ServiceMethod<StoreList, StoreListOk, Failure>
  }
  upload: {
    add: ServiceMethod<UploadAdd, UploadAddOk, Failure>
    remove: ServiceMethod<UploadRemove, UploadRemoveOk, Failure>
    list: ServiceMethod<UploadList, UploadListOk, Failure>
  },
  console: {
    log: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.log>,
      {},
      never
    >
    error: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.error>,
      never,
      Failure & { cause: unknown }
    >
  }
}

export interface StoreServiceContext {
  maxUploadSize: number

  storeTable: StoreTable
  carStoreBucket: CarStoreBucket
  access: AccessVerifier
}

export interface UploadServiceContext {
  uploadTable: UploadTable
  dudewhereBucket: DudewhereBucket
  access: AccessVerifier
}

export interface ConsoleServiceContext {
}

export interface ServiceContext
  extends StoreServiceContext,
  ConsoleServiceContext,
  UploadServiceContext {}
export interface UcantoServerContext extends ServiceContext {
  id: Signer
  codec?: InboundCodec
  errorReporter: ErrorReporter
}

export interface UcantoServerTestContext
  extends UcantoServerContext,
  StoreTestContext,
  UploadTestContext {}

export interface StoreTestContext {
  testStoreTable: TestStoreTable
  testSpaceRegistry: TestSpaceRegistry
}

export interface UploadTestContext {}

export interface ErrorReporter {
  catch: (error: HandlerExecutionError) => void
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
  use (options?: CarStoreBucketOptions): Promise<CarStoreBucket>
}

export interface DudewhereBucket {
  put: (dataCid: string, carCid: string) => Promise<void>
}

export interface StoreTable {
  exists: (space: DID, link: UnknownLink) => Promise<boolean>
  insert: (item: StoreAddInput) => Promise<StoreAddOutput>
  remove: (space: DID, link: UnknownLink) => Promise<void>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<ListResponse<StoreListItem>>
}

export interface TestStoreTable {
  get (
    space: DID,
    link: UnknownLink
  ): Promise<(StoreAddInput & StoreListItem) | undefined>
}

export interface UploadTable {
  exists: (space: DID, root: UnknownLink) => Promise<boolean>
  insert: (item: UploadAddInput) => Promise<UploadAddOk>
  remove: (space: DID, root: UnknownLink) => Promise<UploadRemoveOk | null>
  list: (
    space: DID,
    options?: ListOptions
  ) => Promise<ListResponse<UploadListItem>>
}

export interface StoreAddInput {
  space: DID
  link: UnknownLink
  size: number
  origin?: UnknownLink
  issuer: DID
  invocation: UCANLink
}

export interface StoreAddOutput
  extends Omit<StoreAddInput, 'space' | 'issuer' | 'invocation'> {}

export interface StoreListItem extends StoreAddOutput {
  insertedAt: string
}

export interface StoreListOk extends ListResponse<StoreListItem> {}

export type StoreAddOk = StoreAddDone | StoreAddUpload

export interface StoreAddDone {
  status: 'done'
  with: DID
  link: UnknownLink
  url?: undefined
  headers?: undefined
}

export interface StoreAddUpload {
  status: 'upload'
  with: DID
  link: UnknownLink
  url: URL
  headers: Record<string, string>
}

export interface UploadAddInput {
  space: DID
  root: UnknownLink
  shards?: UnknownLink[]
  issuer: DID
  invocation: UCANLink
}

export interface UploadAddOk
  extends Omit<UploadAddInput, 'space' | 'issuer' | 'invocation'> {}
export type UploadRemoveOk = UploadDIDRemove | UploadDidNotRemove

export interface UploadDIDRemove extends UploadAddOk {}
export interface UploadDidNotRemove {
  root?: undefined
  shards?: undefined
}

export interface UploadListItem extends UploadAddOk {
  insertedAt: string
  updatedAt: string
}

export interface UploadListOk extends ListResponse<UploadListItem> {}

export interface ListOptions {
  size?: number
  cursor?: string
  pre?: boolean
}

export interface ListResponse<R> {
  // cursor and after should be identical
  cursor?: string
  before?: string
  after?: string
  size: number
  results: R[]
}

export interface AccessVerifier {
  /**
   * Determines if the issuer of the invocation has received a delegation
   * allowing them to issue the passed invocation.
   */
  allocateSpace: (
    invocation: Invocation
  ) => Promise<Result<AllocateOk, Failure>>
}

interface AllocateOk {}

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
