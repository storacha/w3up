import { Agent } from '@web3-storage/access/agent'
import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'
import type { Service } from '@web3-storage/access/types'
import type { Capability, DID, Proof, Signer, ConnectionView, Principal } from '@ucanto/interface'
import * as RSASigner from '@ucanto/principal/rsa'

const DB_NAME = 'w3ui'
const DB_STORE_NAME = 'keyring'

export class Space implements Principal {
  #did: DID
  #meta: Record<string, any>

  constructor (did: DID, meta: Record<string, any> = {}) {
    this.#did = did
    this.#meta = meta
  }

  /**
   * The given space name.
   */
  name (): string | undefined {
    return this.#meta.name == null ? String(this.#meta.name) : undefined
  }

  /**
   * The DID of the space.
   */
  did (): DID {
    return this.#did
  }

  /**
   * Whether the space has been registered with the service.
   */
  registered (): boolean {
    return Boolean(this.#meta.isRegistered)
  }

  /**
   * User defined space metadata.
   */
  meta (): Record<string, any> {
    return this.#meta
  }
}

export interface KeyringContextState {
  /**
   * The current space.
   */
  space?: Space
  /**
   * Spaces available to this agent.
   */
  spaces: Space[]
  /**
   * The current user agent (this device).
   */
  agent?: Signer
}

export interface KeyringContextActions {
  /**
   * Load the user agent and all stored data from secure storage.
   */
  loadAgent: () => Promise<void>
  /**
   * Unload the user agent and all stored data from secure storage. Note: this
   * does not remove data, use `resetAgent` if that is desired.
   */
  unloadAgent: () => Promise<void>
  /**
   * Unload the current space and agent from memory and remove from secure
   * storage. Note: this removes all data and is unrecoverable.
   */
  resetAgent: () => Promise<void>
  /**
   * Create a new space with the passed name and set it as the current space.
   */
  createSpace: (name?: string) => Promise<DID>
  /**
   * Use a specific space.
   */
  setCurrentSpace: (did: DID) => Promise<void>
  /**
   * Register the current space, verify the email address and store in secure
   * storage. Use cancelRegisterSpace to abort. Automatically sets the
   * newly registered space as the current space.
   */
  registerSpace: (email: string) => Promise<void>
  /**
   * Abort an ongoing account registration.
   */
  cancelRegisterSpace: () => void
  /**
   * Get all the proofs matching the capabilities. Proofs are delegations with
   * an audience matching the agent DID.
   */
  getProofs: (caps: Capability[]) => Promise<Proof[]>
}

export interface ServiceConfig {
  servicePrincipal?: Principal
  connection?: ConnectionView<Service>
}

export function getCurrentSpace (agent: Agent): Space | undefined {
  const did = agent.currentSpace()
  if (did == null) return
  const meta = agent.spaces.get(did)
  return new Space(did, meta)
}

export function getSpaces (agent: Agent): Space[] {
  const spaces: Space[] = []
  for (const [did, meta] of agent.spaces.entries()) {
    spaces.push(new Space(did, meta))
  }
  return spaces
}

export interface CreateAgentOptions extends ServiceConfig {}

/**
 * Create an agent for managing identity. It uses RSA keys that are stored in
 * IndexedDB as unextractable `CryptoKey`s.
 */
export async function createAgent (options: CreateAgentOptions = {}): Promise<Agent> {
  const dbName = `${DB_NAME}${(options.servicePrincipal != null) ? '@' + options.servicePrincipal.did() : ''}`
  const store = new StoreIndexedDB(dbName, { dbVersion: 1, dbStoreName: DB_STORE_NAME })
  const raw = await store.load()
  if (raw != null) return Object.assign(Agent.from(raw, { ...options, store }), { store })
  const principal = await RSASigner.generate()
  return Object.assign(await Agent.create({ principal }, { ...options, store }), { store })
}
