import type { Capabilities, Phantom } from '@ucanto/interface'

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>
