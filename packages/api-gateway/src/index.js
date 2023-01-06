/* eslint-disable no-console */
// import { preflight } from '@web3-storage/worker-utils/cors'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagUcan from '@ipld/dag-ucan'
import * as carTransport from '@ucanto/transport/car'
import toBuffer from 'it-to-buffer'
import toIt from 'browser-readablestream-to-it'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as ucanto from '@ucanto/interface'
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
 * UCAN from http request authorization bearer token
 */
// @ts-ignore
// eslint-disable-next-line no-unused-vars
class UcanBearerToken {
  /**
   * @param {string} header - http authorization header value
   * @returns {UcanBearerToken}
   */
  static fromHeader(header) {
    return new UcanBearerToken(header.replace(/^Bearer /, ''))
  }

  /**
   * @param {string} token
   * @protected
   */
  constructor(token) {
    if (!token) {
      throw new Error(`cannot create UcanBearerToken from empty token`)
    }
    this.token = token
    this.parsed = dagUcan.decode(Buffer.from(token))
  }
}

/**
 * @type {Record<string, (...args: any[]) => Promise<ucanto.Invocation>>}
 */
const UcantoInvocation = {
  /**
   * @param {Request} request
   * @returns {Promise<ucanto.Invocation>}
   */
  fromRequest: async (request) => {
    const invocations = await carTransport.decode({
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body
        ? await toBuffer(toIt(request.body))
        : Uint8Array.from([]),
    })
    if (invocations.length !== 1) {
      throw new Error(
        `expected parsed request body CAR to contain exactly one invocation, got ${invocations.length}`
      )
    }
    const [invocation] = invocations
    return invocation
  },
}

const SingleCapability = {
  /**
   * parse a single capability from a ucanto invocation.
   * errors if invocation contains more than one capability.
   *
   * @template {dagUcan.Capability} C
   * @param {ucanto.Invocation<C>} invocation
   * @returns {C}
   */
  fromInvocation(invocation) {
    if (invocation.capabilities.length !== 1) {
      throw new Error(
        `expected parsed invocation to contain exactly one capability, got ${invocation.capabilities.length}`
      )
    }
    return invocation.capabilities[0]
  },
}

/**
 * @param {dagUcan.Capability} capability
 * @returns {(req: Request) => Promise<Response>}
 */
function getUpstreamForCapability(capability) {
  if (capability.can.startsWith('test/')) {
    // respond with cbor
    return async () => {
      const body = dagCbor.encode([{}])
      const headers = {
        'content-type': 'application/cbor',
      }
      return new Response(body, { headers, status: 200 })
    }
  }
  if (capability.can.startsWith('store/')) {
    return async (request) => {
      const upstreamRequest = new Request('https://up.web3.storage', request)
      const response = await fetch(upstreamRequest)
      return response
    }
  }
  return async (request) => {
    const upstreamRequest = new Request('https://access.web3.storage', request)
    const response = await fetch(upstreamRequest)
    return response
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
    if (request.headers.get('content-type') !== 'application/car') {
      return new Response('content-type must be application/car', {
        status: 415,
      })
    }
    // get ucanto invocation from request
    const invocation = await UcantoInvocation.fromRequest(request.clone())
    const capability = SingleCapability.fromInvocation(invocation)
    // determine upstream to handle capability
    const upstreamFetch = getUpstreamForCapability(capability)
    const response = await upstreamFetch(request.clone())
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
