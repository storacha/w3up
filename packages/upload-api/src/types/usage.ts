import { Failure, Result, UnknownLink } from '@ucanto/interface'
import {
  ProviderDID,
  SpaceDID,
  UsageData,
  EgressData,
  AccountDID,
} from '@web3-storage/capabilities/types'

export type { UsageData }

export interface UsageStorage {
  report: (
    provider: ProviderDID,
    space: SpaceDID,
    period: { from: Date; to: Date }
  ) => Promise<Result<UsageData, Failure>>
  record: (
    customer: AccountDID,
    resource: UnknownLink,
    bytes: number,
    servedAt: Date
  ) => Promise<Result<EgressData, Failure>>
}
