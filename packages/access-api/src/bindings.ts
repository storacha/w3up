import type { Logging } from '@web3-storage/worker-utils/logging'
import type { Handler as _Handler } from '@web3-storage/worker-utils/router'
import { Spaces } from './models/spaces.js'
import { Validations } from './models/validations.js'
import { loadConfig } from './config.js'
import { ConnectionView, Signer as EdSigner } from '@ucanto/principal/ed25519'
import { Accounts } from './models/accounts.js'
import { DelegationsStorage as Delegations } from './types/delegations.js'
import { ProvisionsStorage } from './types/provisions.js'
import { R2Bucket } from '@miniflare/r2'
import { DID, Link, Delegation, Signature, Block } from '@ucanto/interface'
export * from '@ucanto/interface'

export {}

// CF Analytics Engine types not available yet
export interface AnalyticsEngine {
  writeDataPoint: (event: AnalyticsEngineEvent) => void
}

export interface AnalyticsEngineEvent {
  readonly doubles?: number[]
  readonly blobs?: Array<ArrayBuffer | string | null>
}

export interface Email {
  sendValidation: (input: { to: string; url: string }) => Promise<void>
  send: (input: {
    to: string
    textBody: string
    subject: string
  }) => Promise<void>
}

// We can't use interface here or it will not extend Record and cause type error
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Env = {
  // vars
  ENV: string
  DEBUG: string
  /**
   * publicly advertised decentralized identifier of the running api service
   * * this may be used to filter incoming ucanto invocations
   */
  DID: `did:web:${string}`
  // URLs to upload-api so we proxy invocations to it
  UPLOAD_API_URL: string
  // secrets
  PRIVATE_KEY: string
  SENTRY_DSN: string
  POSTMARK_TOKEN: string
  POSTMARK_SENDER?: string
  UCAN_LOG_URL?: string
  UCAN_LOG_BASIC_AUTH?: string

  /** CSV DIDs of services that can be used to provision spaces. */
  PROVIDERS?: string
  DEBUG_EMAIL?: string
  LOGTAIL_TOKEN: string
  // bindings
  SPACES: KVNamespace
  VALIDATIONS: KVNamespace
  W3ACCESS_METRICS: AnalyticsEngine
  /**
   * will be used for storing env.models.delegations CARs
   */
  DELEGATIONS_BUCKET: R2Bucket
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __D1_BETA__: D1Database
}

export interface HandlerContext {
  waitUntil: (promise: Promise<any>) => void
}

export interface RouteContext {
  log: Logging
  signer: EdSigner.Signer
  config: ReturnType<typeof loadConfig>
  url: URL
  email: Email
  ucanLog: UCANLog
  models: {
    accounts: Accounts
    delegations: Delegations
    spaces: Spaces
    provisions: ProvisionsStorage
    validations: Validations
  }
  uploadApi: ConnectionView<any>
}

export interface UCANLog {
  /**
   * This can fail if it is unable to write to the underlying store. Handling
   * invocations will be blocked until write is complete. Implementation may
   * choose to do several retries before failing.
   *
   * @param car - UCAN invocations in CAR. Each invocation is a root in the CAR.
   */
  logInvocations: (car: Uint8Array) => Promise<void>
  /**
   * Takes DAG-CBOR encoded invocation receipts. It is not allowed to fail and
   * promise is only going to be used to keep worker waiting. It is not allowed
   * to fail because by the time it is called invocation handler has already
   * ran and did some IO which can't be rolled back. So it's up to implementation
   * to either keep retrying or to store receipts in some queue and retry later.
   *
   * @see https://github.com/ucan-wg/invocation/#8-receipt
   *
   * @param receipt - DAG-CBOR encoded invocation receipt
   */
  logReceipt: (block: ReceiptBlock) => Promise<void>
}

export interface Receipt {
  ran: Link
  out: ReceiptResult
  meta: Record<string, unknown>
  iss?: DID
  prf?: Array<Link<Delegation>>

  s: Signature
}

export interface ReceiptBlock extends Block<Receipt> {
  data: Receipt
}

/**
 * Defines result type as per invocation spec
 *
 * @see https://github.com/ucan-wg/invocation/#6-result
 */

export type ReceiptResult<T = unknown, X extends {} = {}> = Variant<{
  ok: T
  error: X
}>

/**
 * Utility type for defining a [keyed union] type as in IPLD Schema. In practice
 * this just works around typescript limitation that requires discriminant field
 * on all variants.
 *
 * ```ts
 * type Result<T, X> =
 *   | { ok: T }
 *   | { error: X }
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *   //  ^^^^^^^^^ Property 'ok' does not exist on type '{ error: Error; }`
 *   }
 * }
 * ```
 *
 * Using `Variant` type we can define same union type that works as expected:
 *
 * ```ts
 * type Result<T, X> = Variant<{
 *   ok: T
 *   error: X
 * }>
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *     result.ok.toUpperCase()
 *   }
 * }
 * ```
 *
 * [keyed union]:https://ipld.io/docs/schemas/features/representation-strategies/#union-keyed-representation
 */
export type Variant<U extends Record<string, unknown>> = {
  [Key in keyof U]: { [K in Exclude<keyof U, Key>]?: never } & {
    [K in Key]: U[Key]
  }
}[keyof U]

export type Handler = _Handler<RouteContext>

export type Bindings = Record<
  string,
  | string
  | undefined
  | KVNamespace
  | DurableObjectNamespace
  | CryptoKey
  | D1Database
  | AnalyticsEngine
  | R2Bucket
>

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace ModuleWorker {
  type FetchHandler<Environment extends Bindings = Bindings> = (
    request: Request,
    env: Environment,
    ctx: Pick<FetchEvent, 'waitUntil' | 'passThroughOnException'>
  ) => Promise<Response> | Response

  type CronHandler<Environment extends Bindings = Bindings> = (
    event: Omit<ScheduledEvent, 'waitUntil'>,
    env: Environment,
    ctx: Pick<ScheduledEvent, 'waitUntil'>
  ) => Promise<void> | void
}

export interface ModuleWorker {
  fetch?: ModuleWorker.FetchHandler<Env>
  scheduled?: ModuleWorker.CronHandler<Env>
}

// D1 types

export interface D1ErrorRaw extends Error {
  cause: Error & { code: string }
}
