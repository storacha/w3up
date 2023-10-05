import type {
  HandlerExecutionError,
  Signer,
  InboundCodec,
  CapabilityParser,
  ParsedCapability,
  InferInvokedCapability,
  Match,
  Unit,
  Result
} from '@ucanto/interface'
import type { ProviderInput } from '@ucanto/server'

export * as UcantoInterface from '@ucanto/interface'
export type { Result, Variant } from '@ucanto/interface'
export * from '@web3-storage/filecoin-client/types'
export * from '@web3-storage/capabilities/types'

// Resources
export interface Queue<Message> {
  add: (
    message: Message,
    options?: QueueMessageOptions
  ) => Promise<Result<Unit, QueueAddError>>
}

export interface Store<Record> {
  put: (record: Record) => Promise<Result<Unit, StorePutError>>
  /**
   * Gets a record from the store.
   */
  get: (key: any) => Promise<Result<Record, StoreGetError>>
  /**
   * Determine if a record already exists in the store for the given key.
   */
  has: (key: any) => Promise<Result<boolean, StoreGetError>>
}

export interface QueueMessageOptions {
  messageGroupId?: string
}

// Errors

export type StorePutError =
  | StoreOperationError
  | EncodeRecordFailed
export type StoreGetError =
  | StoreOperationError
  | EncodeRecordFailed
  | StoreNotFound
export type QueueAddError =
  | QueueOperationError
  | EncodeRecordFailed

export interface QueueOperationError extends Error {
  name: 'QueueOperationFailed'
}

export interface StoreOperationError extends Error {
  name: 'StoreOperationFailed'
}

export interface StoreNotFound extends Error {
  name: 'StoreNotFound'
}

export interface EncodeRecordFailed extends Error {
  name: 'EncodeRecordFailed'
}

// Service utils

export interface UcantoServerContext {
  id: Signer
  codec?: InboundCodec
  errorReporter: ErrorReporter
}

export interface ErrorReporter {
  catch: (error: HandlerExecutionError) => void
}

// test

export interface UcantoServerContextTest extends UcantoServerContext {
  queuedMessages: unknown[]
}

export type Test<S> = (
  assert: Assert,
  context: UcantoServerContextTest & S
) => unknown
export type Tests<S> = Record<string, Test<S>>

export type Input<C extends CapabilityParser<Match<ParsedCapability>>> =
  ProviderInput<InferInvokedCapability<C> & ParsedCapability>

export interface Assert {
  equal: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  deepEqual: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  ok: <Actual>(actual: Actual, message?: string) => unknown
}
