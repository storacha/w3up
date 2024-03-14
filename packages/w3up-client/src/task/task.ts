import type { Result } from '@ucanto/interface'
import { SUSPEND, RESUME } from './constant.js'

export { SUSPEND, RESUME, Result }
export type Suspend = typeof SUSPEND

export interface Throw<Error extends globalThis.Error = globalThis.Error> {
  join?: never
  throw: Error | AbortError
}

export interface Join {
  join(group: Wake): void
}

export type Command = Suspend | Throw<Error> | Join

export interface Task<
  Ok,
  Error extends globalThis.Error = never,
  Command extends Suspend | Join | Throw<Error> = Suspend | Join | Throw<Error>
> {
  [Symbol.iterator](): Execution<Ok, Command>
}

export interface Execution<
  Ok extends unknown,
  Command extends Suspend | Join | Throw<Error>
> {
  throw(error: InferError<Command>): Step<Ok, Command>
  return(ok: Ok): Step<Ok, Command>
  next(): Step<Ok, Command>
  [Symbol.iterator](): Execution<Ok, Command>
}

/**
 * Wake handler which can be used to wake the suspended task.
 */
export interface Wake {
  wake(): void
}

export type Step<
  Ok extends unknown,
  Command extends Suspend | Join | Throw<Error>
> = IteratorResult<Command, Ok>

export type InferError<Command> = Command extends Throw<infer Error>
  ? Error
  : never

/**
 * Future is a type safe promise as it captures both success and error types and
 * provides functionality to move from try/catch operating mode into `Result`
 * based one.
 */
export interface Future<Ok extends unknown, Error extends globalThis.Error>
  extends Promise<Ok> {
  /**
   * Returns a promise for the `Result` that captures both success or error
   * cases.
   */
  result(): Invocation<Result<Ok, Error>>
}

export interface AbortError extends Error {
  name: 'AbortError'
  reason: unknown
}

export interface Invocation<
  Ok extends unknown,
  Fail extends globalThis.Error = never
> extends Future<Ok, Fail | AbortError>,
    Task<Ok, Fail> {
  abort(reason: unknown): void

  [Symbol.iterator](): Execution<Ok, Suspend | Join | Throw<Fail>>
}
