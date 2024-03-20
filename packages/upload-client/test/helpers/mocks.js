import * as Server from '@ucanto/server'

const notImplemented = () => {
  throw new Server.Failure('not implemented')
}

/**
 * @param {Partial<{
 *   store: Partial<import('../../src/types.js').Service['store']>
 *   upload: Partial<import('../../src/types.js').Service['upload']>
 *   usage: Partial<import('../../src/types.js').Service['usage']>
 *   filecoin: Partial<import('@web3-storage/filecoin-client/storefront').StorefrontService['filecoin']>
 * }>} impl
 */
export function mockService(impl) {
  return {
    store: {
      add: withCallCount(impl.store?.add ?? notImplemented),
      get: withCallCount(impl.store?.get ?? notImplemented),
      list: withCallCount(impl.store?.list ?? notImplemented),
      remove: withCallCount(impl.store?.remove ?? notImplemented),
    },
    upload: {
      add: withCallCount(impl.upload?.add ?? notImplemented),
      get: withCallCount(impl.upload?.get ?? notImplemented),
      list: withCallCount(impl.upload?.list ?? notImplemented),
      remove: withCallCount(impl.upload?.remove ?? notImplemented),
    },
    usage: {
      report: withCallCount(impl.usage?.report ?? notImplemented),
    },
    filecoin: {
      offer: withCallCount(impl.filecoin?.offer ?? notImplemented),
      submit: withCallCount(impl.filecoin?.submit ?? notImplemented),
      accept: withCallCount(impl.filecoin?.accept ?? notImplemented),
      info: withCallCount(impl.filecoin?.info ?? notImplemented),
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
