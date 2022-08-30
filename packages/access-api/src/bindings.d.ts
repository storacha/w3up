import type { Logging } from '@web3-storage/worker-utils/logging'
import type { SigningAuthority } from '@ucanto/interface'
import type { config } from './config'

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
}

export interface RouteContext {
  params: Record<string, string>
  log: Logging
  keypair: SigningAuthority
  config: typeof config
  url: URL
  event: FetchEvent
}

export type Handler = (
  event: FetchEvent,
  ctx: RouteContext
) => Promise<Response> | Response
