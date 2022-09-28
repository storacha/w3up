import type { Logging } from '@web3-storage/worker-utils/logging'
import type { SigningPrincipal } from '@ucanto/interface'
import type { config } from './config'
import { Email } from './utils/email.js'
import { Accounts } from './kvs/accounts.js'
import { Validations } from './kvs/validations.js'
import { D1QB } from 'workers-qb'

export {}

// CF Analytics Engine types not available yet
export interface AnalyticsEngine {
  writeDataPoint: (event: AnalyticsEngineEvent) => void
}

export interface AnalyticsEngineEvent {
  readonly doubles?: number[]
  readonly blobs?: Array<ArrayBuffer | string | null>
}

declare global {
  const ACCOUNTS: KVNamespace
  const VALIDATIONS: KVNamespace
  const W3ACCESS_METRICS: AnalyticsEngine
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __D1_BETA__: D1Database
}

export interface RouteContext {
  params: Record<string, string>
  log: Logging
  keypair: SigningPrincipal
  config: typeof config
  url: URL
  event: FetchEvent
  email: Email
  kvs: {
    accounts: Accounts
    validations: Validations
  }
  db: D1QB
}

export type Handler = (
  event: FetchEvent,
  ctx: RouteContext
) => Promise<Response> | Response
