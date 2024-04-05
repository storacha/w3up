import type {
  UnknownLink,
  Receipt,
  Invocation,
  Result,
  Unit,
  Failure,
} from '@ucanto/interface'
import { Storage } from './storage.js'

export type ReceiptsStorage = Storage<UnknownLink, Receipt>
export interface TasksScheduler {
  schedule: (invocation: Invocation) => Promise<Result<Unit, Failure>>
}
