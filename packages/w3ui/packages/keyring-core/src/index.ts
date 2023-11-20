import type { Abilities, AgentMeta, PlanGetFailure, PlanGetSuccess, Service } from '@web3-storage/access/types'
import type {
  Capability,
  DID,
  Proof,
  Principal,
  Delegation,
  UCANOptions,
  Signer
} from '@ucanto/interface'
import type { ServiceConfig } from './service'
import type { EmailAddress } from '@web3-storage/w3up-client/types'
import { getAccountPlan } from '@web3-storage/access/agent'
import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'
import * as Ucanto from '@ucanto/interface'
import { fromEmail as mailtoDidFromEmail } from '@web3-storage/did-mailto'
import { Client, create as createW3UPClient } from '@web3-storage/w3up-client'
import * as W3Account from '@web3-storage/w3up-client/account'
import { Space } from '@web3-storage/w3up-client/space'
import { createServiceConf } from './service'

export { Abilities, AgentMeta, Service, Client, Space, ServiceConfig }

const DB_NAME = 'w3ui'
const DB_STORE_NAME = 'keyring'
export const W3UI_ACCOUNT_LOCALSTORAGE_KEY = 'w3ui-account-email'
export type PlanGetResult = Ucanto.Result<PlanGetSuccess, PlanGetFailure | Ucanto.Failure>

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
  /**
   * The w3up client representing the current user agent (this device).
   */
  client?: Client
  /**
   * The account this device is authorized to act as. Currently just an email address.
   */
  account?: string
}

export interface RegisterSpaceOpts {
  provider?: DID<'web'>
}

export type Email = `${string}@${string}`
export interface Plan {
  product?: DID
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
   * Authorize this device to act as the account linked to email.
   */
  authorize: (email: Email) => Promise<void>
  /**
   * Abort an ongoing account authorization.
   */
  cancelAuthorize: () => void
  /**
   * Create a new space with the passed name and set it as the current space.
   */
  createSpace: (name?: string) => Promise<DID>
  /**
   * Use a specific space.
   */
  setCurrentSpace: (did: DID) => Promise<void>
  /**
   * Register the current space and store in secure storage. Automatically sets the
   * newly registered space as the current space.
   */
  registerSpace: (email: Email, opts?: RegisterSpaceOpts) => Promise<void>
  /**
   * Get all the proofs matching the capabilities. Proofs are delegations with
   * an audience matching the agent DID.
   */
  getProofs: (caps: Capability[]) => Promise<Proof[]>
  /**
   * Create a delegation to the passed audience for the given abilities with
   * the _current_ space as the resource.
   */
  createDelegation: (
    audience: Principal,
    abilities: Abilities[],
    options: CreateDelegationOptions
  ) => Promise<Delegation>
  /**
   * Import a proof that delegates `*` ability on a space to this agent
   */
  addSpace: (proof: Delegation) => Promise<void>
  /**
   * Get the plan
   */
  getPlan: (email: Email) => Promise<PlanGetResult>
}

export type CreateDelegationOptions = Omit<UCANOptions, 'audience'> & {
  audienceMeta?: AgentMeta
}

/**
 * Get plan of the account identified by the given email.
 */
export async function getPlan (client: Client, email: Email): Promise<Ucanto.Result<PlanGetSuccess, PlanGetFailure | Ucanto.Failure>> {
  const agent = client.agent
  return await getAccountPlan(agent, mailtoDidFromEmail(email))
}

export interface CreateAgentOptions extends ServiceConfig {}

/**
 * Create an agent for managing identity. It uses RSA keys that are stored in
 * IndexedDB as unextractable `CryptoKey`s.
 */
export async function createClient (
  options: CreateAgentOptions = {}
): Promise<Client> {
  const dbName = `${DB_NAME}${options.servicePrincipal != null ? '@' + options.servicePrincipal.did() : ''}`
  const store = new StoreIndexedDB(dbName, {
    dbVersion: 1,
    dbStoreName: DB_STORE_NAME
  })
  return await createW3UPClient({
    store, serviceConf: createServiceConf(options)
  })
}

export const useAccount = (client: Client, { email }: { email?: string }): W3Account.Account | undefined => {
  const accounts = Object.values(W3Account.list(client))
  return accounts.find((account) => account.toEmail() === email)
}

export async function login (client: Client, email: EmailAddress): Promise<Ucanto.Result<W3Account.Account, Ucanto.Failure>> {
  return await W3Account.login(client, email)
}
