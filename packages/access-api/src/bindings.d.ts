import type { Logging } from '@web3-storage/worker-utils/logging'
import type {
  AccountTable,
  DelegationTable,
  SpaceTable,
} from '@web3-storage/access/types'
import type { Handler as _Handler } from '@web3-storage/worker-utils/router'
import { Spaces } from './models/spaces.js'
import { Validations } from './models/validations.js'
import { loadConfig } from './config.js'
import { ConnectionView, Signer as EdSigner } from '@ucanto/principal/ed25519'
import { Accounts } from './models/accounts.js'
import { DelegationsStorage as Delegations } from './types/delegations.js'
import { ProvisionsStorage } from './types/provisions.js'

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
  sendValidation: ({ to: string, url: string }) => Promise<void>
  send: ({ to: string, textBody: string, subject: string }) => Promise<void>
}

export interface Env {
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
  UCAN_INVOCATION_POST_BASIC_AUTH: string

  DEBUG_EMAIL?: string
  LOGTAIL_TOKEN: string
  // bindings
  SPACES: KVNamespace
  VALIDATIONS: KVNamespace
  W3ACCESS_METRICS: AnalyticsEngine
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __D1_BETA__: D1Database
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
  uploadApi: ConnectionView
  ucanInvocationPostURL: URL
  ucanInvocationPostBasicAuth: string
}

interface UCANLog {
  /**
   * This can fail if it is unable to write to the underlying store. Handling
   * invocations will be blocked until write is complete. Implementation may
   * choose to do several retries before failing.
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
  logReceipt: (receipt: Uint8Array) => Promise<void>
}

export type Handler = _Handler<RouteContext>

export type Bindings = Record<
  string,
  | KVNamespace
  | DurableObjectNamespace
  | CryptoKey
  | string
  | D1Database
  | AnalyticsEngine
>
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

export interface D1Schema {
  spaces: SpaceTable
  accounts: AccountTable
  delegations: DelegationTable
}
