/* eslint-disable no-console */
// import { preflight } from '@web3-storage/worker-utils/cors'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
import * as dagCbor from '@ipld/dag-cbor'
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
 * @implements {ModuleWorker}
 */
export class ApiGatewayWorker {
  /**
   * @type {ModuleWorker['fetch']}
   */
  fetch = async (request, env, executionContext) => {
    const router = new Router({ onNotFound: notFound })
    router.add('get', '/', () => new Response('Hello world!', { status: 200 }))
    router.add('post', '/', this.fetchPostIndex)
    router.add('get', '/.well-known/did.json', this.fetchGetDidDocument)
    const response = await router.fetch(
      request,
      env,
      executionContext ?? createMockExecutionContext()
    )
    return response
  }

  /**
   * @type {ModuleWorker['fetch']}
   */
  fetchPostIndex = async (request, env, executionContext) => {
    const status = 200
    const headers = {
      'content-type': 'application/cbor',
    }
    const body = dagCbor.encode({})
    const response = new Response(body, { status, headers })
    return response
  }

  /**
   * @type {ModuleWorker['fetch']}
   */
  fetchGetDidDocument = async (request, env, executionContext) => {
    const did = `did:web:${new URL(request.url).host}`
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        // resolves ambiguous fragment uris relative to the did, not earlier context entries
        {
          '@base': did,
        },
      ],
      id: did,
    }
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
