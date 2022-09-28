import { AgentMeta } from '../types.js'
import * as Ucanto from '@ucanto/interface'
import { Delegations } from '../delegations.js'

export interface DelegationsAsJSON {
  created: string
  received: string
  meta: Array<[string, AgentMeta]>
}

export interface StoreData<T extends number> {
  accounts: Array<Ucanto.SigningPrincipal<T>>
  meta: AgentMeta
  agent: Ucanto.SigningPrincipal<T>
  delegations: Delegations
}

export interface Store<T extends number> {
  open: () => Promise<Store<T>>
  close: () => Promise<void>
  exists: () => Promise<boolean>
  init: (data: Partial<StoreData<T>>) => Promise<StoreData<T>>
  save: (data: StoreData<T>) => Promise<Store<T>>
  load: () => Promise<StoreData<T>>
  createAccount: () => Promise<Ucanto.SigningPrincipal<T>>
}
