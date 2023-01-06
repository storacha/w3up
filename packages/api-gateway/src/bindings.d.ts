import type { SpaceTable } from '@web3-storage/access/types'
import type { Handler as _Handler } from '@web3-storage/worker-utils/router'

export {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Env {
  // environment name
  ENV: string
  // what kind of debug info to show. falsy if none
  DEBUG: string
}

export interface RouteContext {
  url: URL
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
    env?: Environment,
    ctx?: Pick<FetchEvent, 'waitUntil' | 'passThroughOnException'>
  ) => Promise<Response>

  type CronHandler<Environment extends Bindings = Bindings> = (
    event: Omit<ScheduledEvent, 'waitUntil'>,
    env: Environment,
    ctx: Pick<ScheduledEvent, 'waitUntil'>
  ) => Promise<void> | void
}

export interface ModuleWorker {
  fetch: ModuleWorker.FetchHandler<Env>
  scheduled?: ModuleWorker.CronHandler<Env>
}

// D1 types

export interface D1ErrorRaw extends Error {
  cause: Error & { code: string }
}

export interface D1Schema {
  spaces: SpaceTable
}
