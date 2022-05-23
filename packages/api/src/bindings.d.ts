import type { Logging } from './utils/logging'
import type * as ucans from 'ucans'

export {}

declare global {
  const _PRIVATE_KEY: string
  const BRANCH: string
  const VERSION: string
  const COMMITHASH: string
  const ENV: string
  const DEBUG: string
}

export interface RouteContext {
  params: Record<string, string>
  log: Logging
  keypair: ucans.EdKeypair
}

export interface Handler {
  (event: FetchEvent, ctx: RouteContext): Promise<Response> | Response
}
