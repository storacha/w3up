import * as Ucanto from '@ucanto/interface'
import { AccountDID } from '../types'

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface AccountsStorage {
  isEmailOrDomainBlocked: (did: AccountDID) => Promise<Ucanto.Result<boolean>>
}
