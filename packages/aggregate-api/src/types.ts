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
  aggregateStore: AggregateStore
  offerStore: OfferStore
}

export interface OfferServiceContext {
  arrangedOfferStore: ArrangedOfferStore
}

export interface ServiceContext
  extends AggregateServiceContext,
    OfferServiceContext {}

export interface ArrangedOfferStore {
  get: (commitmentProof: string) => Promise<string | undefined>
}

export interface OfferStore {
  // queue: (aggregateOffer: AggregateOffer, fxArchive: Uint8Array) => Promise<void>
  put: (commitmentProof: string, offers: Offer[]) => Promise<void>
}

export interface AggregateStore {
  get: (commitmentProof: string) => Promise<unknown[] | undefined>
}

export interface AggregateOffer {
  commitmentProof: string
  offers: Offer[]
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

export interface AggregateStoreBackend {
  put: (commitmentProof: string, aggregateInfo: unknown) => Promise<void>
}

export interface UcantoServerContextTest extends UcantoServerContext {
  aggregateStoreBackend: AggregateStoreBackend
}

export type Test = (assert: Assert, context: UcantoServerContextTest) => unknown
export type Tests = Record<string, Test>
