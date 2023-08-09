import * as Server from '@ucanto/server'

const notImplemented = () => {
  throw new Server.Failure('not implemented')
}

/**
 * @param {Partial<
 * import('../../src/types').StorefrontService &
 * import('../../src/types').AggregatorService &
 * import('../../src/types').DealerService &
 * import('../../src/types').ChainTrackerService
 * >} impl
 */
export function mockService(impl) {
  return {
    filecoin: {
      add: withCallCount(impl.filecoin?.add ?? notImplemented),
      queue: withCallCount(impl.filecoin?.queue ?? notImplemented),
    },
    aggregate: {
      add: withCallCount(impl.aggregate?.add ?? notImplemented),
      queue: withCallCount(impl.aggregate?.queue ?? notImplemented),
    },
    deal: {
      add: withCallCount(impl.deal?.add ?? notImplemented),
      queue: withCallCount(impl.deal?.queue ?? notImplemented),
    },
    'chain-tracker': {
      info: withCallCount(impl['chain-tracker']?.info ?? notImplemented),
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
