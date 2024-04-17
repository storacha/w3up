import type {
  UnknownLink,
  Receipt,
  Result,
  Unit,
  Failure,
  ServiceInvocation,
} from '@ucanto/interface'
import { Storage } from './storage.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReceiptsStorage = Storage<UnknownLink, Receipt<any, any>>
export interface TasksScheduler {
  schedule: (invocation: ServiceInvocation) => Promise<Result<Unit, Failure>>
}
