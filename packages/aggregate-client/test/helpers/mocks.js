import * as Server from '@ucanto/server'

const notImplemented = () => {
  throw new Server.Failure('not implemented')
}

/**
 * @param {Partial<{
 *   aggregate: Partial<import('../../src/types').Service['aggregate']>
 *   offer: Partial<import('../../src/types').Service['offer']>
 * }>} impl
 */
export function mockService(impl) {
  return {
    aggregate: {
      offer: withCallCount(impl.aggregate?.offer ?? notImplemented),
      get: withCallCount(impl.aggregate?.get ?? notImplemented),
    },
    offer: {
      arrange: withCallCount(impl.offer?.arrange ?? notImplemented),
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
