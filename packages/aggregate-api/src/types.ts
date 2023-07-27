import type {
  HandlerExecutionError,
  Signer,
  InboundCodec,
  CapabilityParser,
  ParsedCapability,
  InferInvokedCapability,
  Match,
  Link,
} from '@ucanto/interface'
import type { ProviderInput } from '@ucanto/server'

import type { PieceLink, PieceView } from '@web3-storage/data-segment'
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
  get: (pieceLink: PieceLink) => Promise<string | undefined>
}

export interface OfferStore {
  queue: (aggregateOffer: OfferToQueue) => Promise<void>
}

export interface OfferToQueue {
  piece: PieceView
  offers: PieceView[]
}

export interface AggregateStore {
  get: (pieceLink: PieceLink) => Promise<unknown[] | undefined>
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
  put: (
    pieceLink: Link<unknown, number, number, 0 | 1>,
    aggregateInfo: unknown
  ) => Promise<void>
}

export interface UcantoServerContextTest extends UcantoServerContext {
  // to enable tests to insert data in aggregateStore memory db
  aggregateStoreBackend: AggregateStoreBackend
}

export type Test = (assert: Assert, context: UcantoServerContextTest) => unknown
export type Tests = Record<string, Test>

export type Input<C extends CapabilityParser<Match<ParsedCapability>>> =
  ProviderInput<InferInvokedCapability<C> & ParsedCapability>
