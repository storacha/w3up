import type { Logging } from '@web3-storage/worker-utils/logging'
import type { config } from './config'

export {}

declare global {}

export interface RouteContext {
  rooms: DurableObjectNamespace
  log: Logging
  config: typeof config
}

declare namespace ModuleWorker {
  type Bindings = Record<
    string,
    KVNamespace | DurableObjectNamespace | CryptoKey | string
  >

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

export interface ModuleWorker<
  Environment extends ModuleWorker.Bindings = ModuleWorker.Bindings
> {
  fetch?: ModuleWorker.FetchHandler<Environment>
  scheduled?: ModuleWorker.CronHandler<Environment>
}
