import { Miniflare } from 'miniflare'
import assert from 'node:assert'

/**
 * @typedef FetchTestContext
 * @property {URL} url
 * @property {(request: Request) => Promise<Response>} fetch
 */

/**
 * @typedef {(ctx: FetchTestContext) => Promise<void>} FetchTest
 */

/**
 * @typedef {(testName: string, test: FetchTest) => void} FetchTestNamer
 */

/**
 * @param {Miniflare} [miniflare]
 */
export function withMiniflare(
  miniflare = new Miniflare({
    packagePath: true,
    wranglerConfigPath: true,
    sourceMap: true,
    modules: true,
    bindings: {},
    d1Persist: undefined,
    buildCommand: undefined,
    port: 0,
  })
) {
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
 * @returns (test: FethTest) => Promise<void>
 */
export function createMiniflareTester(miniflare = createDefaultMiniflare()) {
  /**
   * @param {(ctx: FetchTestContext) => Promise<void>} test
   */
  return async (test) => {
    await withMiniflare(miniflare)(async ({ url }) => {
      await test({
        url,
        fetch: (request) => fetch(request),
      })
    })
  }
}

/**
 * @param {{ fetch: import("../src").ModuleWorker['fetch'] }} worker
 * @returns (test: FethTest) => Promise<void>
 */
export function createWorkerTester(worker) {
  /**
   * @param {(ctx: FetchTestContext) => Promise<void>} test
   */
  return async (test) => {
    await test({
      url: new URL('http://example.com'),
      fetch: (request) => worker.fetch(request),
    })
  }
}
