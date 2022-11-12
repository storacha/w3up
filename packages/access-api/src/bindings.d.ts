import type { Logging } from '@web3-storage/worker-utils/logging'
import type { Handler as _Handler } from '@web3-storage/worker-utils/router'
import type { Signer } from '@ucanto/interface'
import { Email } from './utils/email.js'
import { Accounts } from './kvs/accounts.js'
import { Validations } from './kvs/validations.js'
import { D1QB } from 'workers-qb'
import { loadConfig } from './config.js'

export {}

// CF Analytics Engine types not available yet
export interface AnalyticsEngine {
  writeDataPoint: (event: AnalyticsEngineEvent) => void
}

export interface AnalyticsEngineEvent {
  readonly doubles?: number[]
  readonly blobs?: Array<ArrayBuffer | string | null>
}

export interface Env {
  // vars
  ENV: string
  DEBUG: string
  // secrets
  PRIVATE_KEY: string
  SENTRY_DSN: string
  POSTMARK_TOKEN: string
  LOGTAIL_TOKEN: string
  // bindings
  ACCOUNTS: KVNamespace
  VALIDATIONS: KVNamespace
  W3ACCESS_METRICS: AnalyticsEngine
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __D1_BETA__: D1Database
}

export interface RouteContext {
  log: Logging
  signer: Signer<'key'>
  config: ReturnType<typeof loadConfig>
  url: URL
  email: Email
  kvs: {
    accounts: Accounts
    validations: Validations
  }
  db: D1QB
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
