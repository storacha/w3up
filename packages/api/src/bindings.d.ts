import type { Logging } from './utils/logging'

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
}

export interface Handler {
  (event: FetchEvent, ctx: RouteContext): Promise<Response> | Response
}
