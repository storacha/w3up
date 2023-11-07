import { Failure, Result } from '@ucanto/interface'
import { ProviderDID, SpaceDID, UsageData } from '../types.js'

export interface UsageStorage {
  report: (
    provider: ProviderDID,
    space: SpaceDID,
    period: { from: Date; to: Date }
  ) => Promise<Result<UsageData, Failure>>
}
