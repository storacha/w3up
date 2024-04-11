import type {
  UnknownLink,
  Receipt,
  Invocation,
  Result,
  Unit,
  Failure,
} from '@ucanto/interface'
import { Storage } from './storage.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReceiptsStorage = Storage<UnknownLink, Receipt<any, any>>
export interface TasksScheduler {
  schedule: (invocation: Invocation) => Promise<Result<Unit, Failure>>
}
