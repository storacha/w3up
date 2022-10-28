import type { Capabilities, DID, Phantom } from '@ucanto/interface'

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export interface SettingsRaw {
  agent_secret?: string
  account_secret?: string
  email?: string
  account?: DID
  delegations: Record<DID, { ucan: string; alias: string }>
}
