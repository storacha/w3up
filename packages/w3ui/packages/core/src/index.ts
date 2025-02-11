import type { AgentDataExport } from '@storacha/access/types'
import type { ServiceConfig } from './service.js'

import { StoreIndexedDB } from '@storacha/access/stores/store-indexeddb'
import { Client, create as createStorachaClient } from '@storacha/client'
import { Account } from '@storacha/client/account'
import { Space } from '@storacha/client/space'
import { createServiceConf } from './service.js'
import { Driver } from '@storacha/access/drivers/types'

export * from '@storacha/client/types'
export { Client, Account, Space, ServiceConfig }
export type Store = Driver<AgentDataExport>

const DB_NAME = '@w3ui'
const DB_STORE_NAME = 'core'
export const STORE_SAVE_EVENT = 'store:save'

export interface ContextState {
  /**
   * The w3up client representing the current user agent (this device).
   */
  client?: Client
  /**
   * Accounts this agent is authorized to act as.
   */
  accounts: Account[]
  /**
   * Spaces available to this agent.
   */
  spaces: Space[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextActions {
  /**
   * Reset local store (deleting existing agent), logging the user out.
   */
  logout: () => Promise<void>
}

export interface CreateClientOptions extends ServiceConfig {
  events?: EventTarget
  receiptsEndpoint?: URL
}

/**
 * An IndexedDB store that dispatches an event on the passed EventTarget when
 * `save` is called.
 */
class IndexedDBEventDispatcherStore extends StoreIndexedDB {
  #events: EventTarget

  constructor(name: string, events: EventTarget) {
    super(name, { dbVersion: 1, dbStoreName: DB_STORE_NAME })
    this.#events = events
  }

  async save(data: AgentDataExport): Promise<void> {
    await super.save(data)
    this.#events.dispatchEvent(new CustomEvent('store:save', { detail: data }))
  }
}

/**
 * Create an agent for managing identity. It uses RSA keys that are stored in
 * IndexedDB as unextractable `CryptoKey`s.
 */
export async function createClient(
  options?: CreateClientOptions
): Promise<{ client: Client; events: EventTarget; store: Store }> {
  const dbName = `${DB_NAME}${
    options?.servicePrincipal != null
      ? '@' + options?.servicePrincipal.did()
      : ''
  }`
  const events = options?.events ?? new EventTarget()
  const store = new IndexedDBEventDispatcherStore(dbName, events)
  const serviceConf = createServiceConf(options)
  const client = await createStorachaClient({
    store,
    serviceConf,
    receiptsEndpoint: options?.receiptsEndpoint,
  })
  return { client, events, store }
}
