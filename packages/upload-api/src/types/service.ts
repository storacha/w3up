import type {
  UnknownLink,
  Receipt,
  Result,
  Unit,
  Failure,
  ServiceInvocation,
} from '@ucanto/interface'
import type { Storage, StorageGetError, StoragePutError } from './storage.js'

export type { StorageGetError, StoragePutError }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReceiptsStorage = Storage<UnknownLink, Receipt<any, any>>
export interface TasksScheduler {
  schedule: (invocation: ServiceInvocation) => Promise<Result<Unit, Failure>>
}
