import type { Capabilities, Delegation, DID } from '@ucanto/interface'
import type { EncodedDelegation } from '@web3-storage/access/src/types'

export interface ValidationStore {
  put: <T extends Capabilities>(
    ucan: EncodedDelegation<T>
  ) => Promise<Delegation<T>>
  putSession: <T extends Capabilities>(
    ucan: EncodedDelegation<T>,
    agent: DID,
    ttl?: number
  ) => Promise<void>
  get: <T extends Capabilities>(did: string) => Promise<EncodedDelegation<T>>

  delete: (did: string) => Promise<void>
}
