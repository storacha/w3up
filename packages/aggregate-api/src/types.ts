import type {
  HandlerExecutionError,
  Signer,
  InboundCodec,
} from '@ucanto/interface'

import type { Offer } from '@web3-storage/aggregate-client/types'
export * from '@web3-storage/aggregate-client/types'

export * from '@web3-storage/capabilities/types'
export * as UcantoInterface from '@ucanto/interface'

export interface AggregateServiceContext {
  aggregateArrangedTable: AggregateArrangedTable
  offerBucket: OfferBucket
}

export interface OfferServiceContext {}

export interface ServiceContext
  extends AggregateServiceContext,
    OfferServiceContext {}

export interface OfferBucket {
  put: (offers: Offer[]) => Promise<void>
}

export interface AggregateArrangedTable {
  get: (commitmentProof: string) => Promise<unknown[] | undefined>
  put: (commitmentProof: string, deal: unknown) => Promise<unknown[]>
}

export interface UcantoServerContext extends ServiceContext {
  id: Signer
  codec?: InboundCodec
  errorReporter: ErrorReporter
}

export interface ErrorReporter {
  catch: (error: HandlerExecutionError) => void
}

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

export type Test = (assert: Assert, context: UcantoServerContext) => unknown
export type Tests = Record<string, Test>
