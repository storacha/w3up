import * as Server from '@ucanto/server'

const notImplemented = () => {
  throw new Server.Failure('not implemented')
}

/**
 * @param {Partial<{
 *   store: Partial<import('../../src/types').Service['store']>
 *   upload: Partial<import('../../src/types').Service['upload']>
 * }>} impl
 * @returns {import('../../src/types').Service}
 */
export function mockService(impl) {
  return {
    store: {
      add: impl.store?.add ?? notImplemented,
      list: impl.store?.list ?? notImplemented,
      remove: impl.store?.remove ?? notImplemented,
    },
    upload: {
      add: impl.upload?.add ?? notImplemented,
      list: impl.upload?.list ?? notImplemented,
      remove: impl.upload?.remove ?? notImplemented,
    },
  }
}
