import { DID } from '@ucanto/interface'

export interface AccountRecord {
  did: DID
  inserted_at: Date
  updated_at: Date
}

export interface AccountStore {
  create: (did: DID) => Promise<{ data: Array<{ did: DID }> }>
  get: (did: DID) => Promise<AccountRecord | undefined>
}
