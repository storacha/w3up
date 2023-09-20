import * as Server from '@ucanto/server'

const notImplemented = () => {
  throw new Server.Failure('not implemented')
}

/**
 * @param {Partial<{
 * filecoin: Partial<import('../../src/types').StorefrontService['filecoin']>
 * piece: Partial<import('../../src/types').AggregatorService['piece']>
 * aggregate: Partial<import('../../src/types').DealerService['aggregate']>
 * deal: Partial<import('../../src/types').DealTrackerService['deal']>
 * }>} impl
 */
export function mockService(impl) {
  return {
    filecoin: {
      offer: withCallCount(impl.filecoin?.offer ?? notImplemented),
      submit: withCallCount(impl.filecoin?.submit ?? notImplemented),
      accept: withCallCount(impl.filecoin?.accept ?? notImplemented),
    },
    piece: {
      offer: withCallCount(impl.piece?.offer ?? notImplemented),
      accept: withCallCount(impl.piece?.accept ?? notImplemented),
    },
    aggregate: {
      offer: withCallCount(impl.aggregate?.offer ?? notImplemented),
      accept: withCallCount(impl.aggregate?.accept ?? notImplemented),
    },
    deal: {
      info: withCallCount(impl.deal?.info ?? notImplemented),
    },
  }
}

/**
 * @template {Function} T
 * @param {T} fn
 */
function withCallCount(fn) {
  /** @param {T extends (...args: infer A) => any ? A : never} args */
  const countedFn = (...args) => {
    countedFn.called = true
    countedFn.callCount++
    return fn(...args)
  }
  countedFn.called = false
  countedFn.callCount = 0
  return countedFn
}
