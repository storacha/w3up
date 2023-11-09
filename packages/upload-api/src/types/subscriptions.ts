import { Result } from '@ucanto/interface'
import {
  AccountDID,
  SubscriptionListSuccess,
  SubscriptionListFailure,
} from '@web3-storage/capabilities/types'

export interface SubscriptionsStorage {
  list: (
    customer: AccountDID
  ) => Promise<Result<SubscriptionListSuccess, SubscriptionListFailure>>
}
