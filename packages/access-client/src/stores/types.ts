import { AgentMeta } from '../types.js'
import { RSASigner } from '@ucanto/principal/rsa'
import { Delegation, SignerArchive, DID } from '@ucanto/interface'

export type CIDString = string

export interface DelegationMeta {
  audience: AgentMeta
}

export interface AccountMeta {
  name: string
  registered: boolean
}

export interface StoreData<T> {
  meta: AgentMeta
  principal: T
  currentAccount?: DID
  accs: Map<DID, AccountMeta>
  dels: Map<CIDString, { meta?: DelegationMeta; delegation: Delegation }>
}

export interface Store<T> {
  open: () => Promise<Store<T>>
  close: () => Promise<void>
  exists: () => Promise<boolean>
  init: (data: Partial<StoreData<T>>) => Promise<StoreData<T>>
  save: (data: StoreData<T>) => Promise<Store<T>>
  load: () => Promise<StoreData<T>>
  reset: () => Promise<void>
}

// Store IDB
export interface StoreDataIDB {
  id: number
  meta: import('../types').AgentMeta
  principal: SignerArchive<RSASigner>
  currentAccount?: DID
  accs: Map<DID, AccountMeta>
  dels: Map<
    CIDString,
    {
      meta?: DelegationMeta
      delegation: Array<import('@ucanto/interface').Block>
    }
  >
}
