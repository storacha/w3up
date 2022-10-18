import { AgentMeta } from '../types.js'
import { Delegations } from '../delegations.js'
import ed25519 from '@ucanto/principal/ed25519'

export interface DelegationsAsJSON {
  created: string
  received: string
  meta: Array<[string, AgentMeta]>
}

export interface StoreData<T> {
  accounts: T[]
  meta: AgentMeta
  principal: T
  delegations: Delegations
}

export interface Store<T> {
  open: () => Promise<Store<T>>
  close: () => Promise<void>
  exists: () => Promise<boolean>
  init: (data: Partial<StoreData<T>>) => Promise<StoreData<T>>
  save: (data: StoreData<T>) => Promise<Store<T>>
  load: () => Promise<StoreData<T>>
  createAccount: () => Promise<T>
}

export interface StoreKeyEd extends Store<ed25519.Signer.EdSigner> {}
export interface StoreDataKeyEd extends StoreData<ed25519.Signer.EdSigner> {}
