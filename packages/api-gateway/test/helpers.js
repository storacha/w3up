import { Miniflare } from 'miniflare'
import assert from 'node:assert'

/**
 * @typedef {
 * |((input: URL|RequestInfo, init?: RequestInit) => Promise<Response>)
 * } FetchFunction
 */

/**
 * @typedef FetchTestContext
 * @property {URL} url
 * @property {FetchFunction} fetch
 */

/**
 * @typedef {(ctx: FetchTestContext) => Promise<void>} FetchTest
 */

/**
 * @typedef {(testName: string, test: FetchTest) => void} FetchTestNamer
 */

/**
 * @typedef {(doWork: FetchTest) => () => Promise<void>} FetchTestContextCreator
 */

/**
 * @param {Miniflare} [miniflare]
 */
export function withMiniflare(miniflare = createDefaultMiniflare()) {
  /**
   * @param {(ctx: {url: URL}) => Promise<void>} doWork
   */
  return async function (doWork) {
    const server = await miniflare.createServer()
    try {
      const { url } = await listen(server)
      await doWork({ url })
    } finally {
      server.close()
    }
  }
}

/**
 * Listen to an http server
 *
 * @param {import('node:http').Server} server
 * @returns {Promise<{ url: URL }>}
 */
export function listen(server) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      const address = server.address()
      assert.ok(
        typeof address === 'object' && address,
        'server has address obejct'
      )
      const host = address.address === '::' ? 'localhost' : address.address
      const hostWithPort = `${host}${address.port ? `:${address.port}` : ''}`
      const url = new URL(`http://${hostWithPort}`)
      // eslint-disable-next-line unicorn/no-useless-undefined
      resolve({ url })
    }
    server.listen(0, (/** @type {Error} */ err) =>
      err ? reject(err) : onListening()
    )
  })
}

export function createDefaultMiniflare() {
  return new Miniflare({
    packagePath: true,
    wranglerConfigPath: true,
    sourceMap: true,
    modules: true,
    bindings: {},
    d1Persist: undefined,
    buildCommand: undefined,
    port: 0,
  })
}

/**
 * @param {Miniflare} miniflare
 * @param {FetchFunction} [fetch]
 * @returns {(test: FetchTest) => Promise<void>}
 */
export function createMiniflareTester(
  miniflare = createDefaultMiniflare(),
  fetch = globalThis.fetch
) {
  /**
   * @param {(ctx: FetchTestContext) => Promise<void>} test
   */
  return async (test) => {
    await withMiniflare(miniflare)(async ({ url }) => {
      await test({
        url,
        fetch,
      })
    })
  }
}

/**
 * @param {{ fetch: import("../src").ModuleWorker['fetch'] }} worker
 * @returns {(test: FetchTest) => Promise<void>}
 */
export function createWorkerTester(worker) {
  /**
   * @param {(ctx: FetchTestContext) => Promise<void>} test
   */
  return async (test) => {
    await test({
      url: new URL('http://example.com'),
      /**
       * @param {URL|RequestInfo} input
       * @param {RequestInit} [init]
       */
      fetch: (input, init) => {
        const response = new Request(input, init)
        return worker.fetch(response)
      },
    })
  }
}
