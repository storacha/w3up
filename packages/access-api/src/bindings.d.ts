import type { Logging } from '@web3-storage/worker-utils/logging'
import type { SigningAuthority } from '@ucanto/interface'
import type { config } from './config'

export {}

declare global {
  const ACCOUNTS: KVNamespace
}

export interface RouteContext {
  params: Record<string, string>
  log: Logging
  keypair: SigningAuthority
  config: typeof config
}

export type Handler = (
  event: FetchEvent,
  ctx: RouteContext
) => Promise<Response> | Response
