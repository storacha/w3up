/* eslint-disable no-console */
// import { preflight } from '@web3-storage/worker-utils/cors'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
// import { version } from './routes/version.js'

/**
 * @typedef {import('./bindings.js').ModuleWorker} ModuleWorker
 */

/**
 * @param {Request} request
 * @returns {import('./bindings.js').RouteContext}
 */
export function routeContextFromRequest(request) {
  return {
    url: new URL(request.url),
  }
}

/**
 * @returns {Pick<FetchEvent, 'waitUntil' | 'passThroughOnException'>}
 */
function createMockExecutionContext() {
  return {
    waitUntil() {
      throw new Error(`waitUntil() not implemented`)
    },
    passThroughOnException() {
      throw new Error(`passThroughOnException() not implemented`)
    },
  }
}

/**
 * @implements {ModuleWorker}
 */
export class ApiGatewayWorker {
  /**
   * @type {ModuleWorker['fetch']}
   */
  async fetch(request, env) {
    const router = new Router({ onNotFound: notFound })
    router.add('get', '/', () => new Response('Hello world!', { status: 200 }))
    router.add('get', '/.well-known/did.json', this.fetchGetDidDocument)
    const response = await router.fetch(
      request,
      env,
      createMockExecutionContext()
    )
    return response
  }

  /**
   * @type {ModuleWorker['fetch']}
   */
  async fetchGetDidDocument(request, env) {
    const did = `did:web:${new URL(request.url).host}`
    const didDocument = { id: did }
    const response = {
      body: JSON.stringify(didDocument, undefined, 2),
      headers: {
        'content-type': 'application/json',
      },
    }
    return new Response(response.body, {
      status: 200,
      headers: response.headers,
    })
  }
}

export default new ApiGatewayWorker()
