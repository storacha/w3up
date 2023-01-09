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
import * as DID from '@ipld/dag-ucan/did'

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
 * @template [Req=Request]
 * @template [Res=Response]]
 * @typedef {(req: Req) => Promise<Res>} Responder
 */

/**
 * create a responder that forwards the request to the given url and proxies the response
 *
 * @param {URL} url - url to forward request to
 * @returns {Responder}
 */
const createForwardingResponder = (url) => {
  return async (request) => {
    const upstreamRequest = new Request(url, request)
    const response = await fetch(upstreamRequest)
    return response
  }
}

/**
 * create a responder that returns a cbor ucanto response that won't be interpreted as an error
 *
 * @param {unknown} [result] - result object to include in ucanto response
 * @returns {Responder}
 */
// @ts-ignore
// eslint-disable-next-line no-unused-vars
const createUcantoCborResponder = (result = {}) => {
  return async () => {
    const body = dagCbor.encode([result])
    const headers = {
      'content-type': 'application/cbor',
    }
    return new Response(body, { headers, status: 200 })
  }
}

/**
 * @type {{ [K in Web3StorageServiceEnvironment]: Web3StorageServiceUrls }}
 */
export const servicesByEnvironment = {
  production: {
    access: new URL('https://access.web3.storage'),
    upload: new URL('https://up.web3.storage'),
  },
  staging: {
    access: new URL('https://w3access-staging.protocol-labs.workers.dev'),
    upload: new URL('https://staging.up.web3.storage'),
  },
}

/**
 * @template Condition
 * @template Action
 * @typedef Route
 * @property {Condition} condition
 * @property {Action} action
 */

/**
 * @template {string} CapNamespace
 * @template Action
 * @typedef {Route<{ capabilityNamespace: Set<CapNamespace> }, Action>} CapabilityNamespaceRoute
 */

/**
 * @template Action
 * @typedef {Route<{ audience: dagUcan.DID }, Action>} AudienceRoute
 */

/**
 * @param {Web3StorageServiceUrls} serviceUrls
 * @returns {Array<CapabilityNamespaceRoute<string, ForwardTo>>}
 */
function capabilityNamespaceRoutesForService(serviceUrls) {
  /** @type {Array<CapabilityNamespaceRoute<string, ForwardTo>>} */
  const routes = [
    {
      condition: {
        capabilityNamespace: new Set(['store', 'upload']),
      },
      action: {
        forwardTo: serviceUrls.upload,
      },
    },
    {
      condition: {
        capabilityNamespace: new Set(['space', 'voucher']),
      },
      action: {
        forwardTo: serviceUrls.access,
      },
    },
  ]
  return routes
}

/**
 * @typedef {Route<{ audience: dagUcan.DID }, Array<Route<{ capabilityNamespace: Set<string> }, { forwardTo: URL }>>>} ApiGatewayRoute
 */

/**
 * @typedef {'staging'|'production'} Web3StorageServiceEnvironment
 */

/**
 * @typedef {'access'|'upload'} Web3StorageServiceName
 */

/**
 * @typedef {{ [K in Web3StorageServiceName]: URL }} Web3StorageServiceUrls
 */

/**
 * @typedef Web3StorageUcantoEnvironment
 * @property {dagUcan.DID} audience
 * @property {Web3StorageServiceUrls} services
 */

/**
 * create a route-by-audience for a given web3.storage environment configuration.
 *
 * @param {Web3StorageUcantoEnvironment} options
 * @returns {Route<{ audience: dagUcan.DID }, Array<Route<{ capabilityNamespace: Set<string> }, { forwardTo: URL }>>>}
 */
function routeForEnvironment(options) {
  return {
    condition: {
      audience: options.audience,
    },
    action: [...capabilityNamespaceRoutesForService(options.services)],
  }
}

/**
 * @type {{ [K in Web3StorageServiceEnvironment]: Web3StorageUcantoEnvironment }}
 */
export const audienceRoutesByEnvironment = {
  staging: {
    audience: DID.parse('did:web:staging.web3.storage').did(),
    services: {
      access: new URL('https://w3access-staging.protocol-labs.workers.dev'),
      upload: new URL('https://staging.up.web3.storage'),
    },
  },
  production: {
    audience: DID.parse('did:web:web3.storage').did(),
    services: {
      access: new URL('https://access.web3.storage'),
      upload: new URL('https://up.web3.storage'),
    },
  },
}

/**
 * @typedef ForwardTo
 * @property {URL} forwardTo
 */

class ApiGatewayRouter {
  /** @type {Array<ApiGatewayRoute>} routes */
  #routes
  /**
   * @param {Array<ApiGatewayRoute>} routes
   */
  constructor(routes) {
    this.#routes = routes
  }

  /**
   * @param {ucanto.Invocation} invocation
   * @returns {ForwardTo|undefined}
   */
  route(invocation) {
    for (const route of this.#routes) {
      if (route.condition.audience === invocation.audience.did()) {
        // audiences match
        const capability = SingleCapability.fromInvocation(invocation)
        const capNamespace = capability.can.split('/')[0]
        for (const capabilityNamespaceRoute of route.action) {
          // capabilityNamespace match
          if (
            capabilityNamespaceRoute.condition.capabilityNamespace.has(
              capNamespace
            )
          ) {
            return capabilityNamespaceRoute.action
          }
        }
      }
    }
    // no route matched
  }
}

/**
 * @implements {ModuleWorker}
 */
export class ApiGatewayWorker {
  /**
   * Get default configuration for how an ApiGateway should route requests
   *
   * @returns {ApiGatewayRouter}
   */
  static getDefaultRouter() {
    return new ApiGatewayRouter([
      routeForEnvironment(audienceRoutesByEnvironment.production),
      routeForEnvironment(audienceRoutesByEnvironment.staging),
    ])
  }

  /** @type {ApiGatewayRouter} */
  #router

  /**
   * @param {ApiGatewayRouter} router
   */
  constructor(router) {
    this.#router = router
  }

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
    const invocation = await UcantoInvocation.fromRequest(request.clone())
    const route = this.#router.route(invocation)
    if (!route) {
      return new Response('no route found for invocation', {
        status: 404,
      })
    }
    const fetchFromUpstream = createForwardingResponder(route.forwardTo)
    // determine upstream to handle capability
    try {
      const response = await fetchFromUpstream(request.clone())
      return response
    } catch (error) {
      console.warn('failed to route invocation', {
        invocation,
        capability: invocation.capabilities[0],
        error,
      })
      const genericError = new Error(
        `failed to get response for routed invocation`,
        {
          cause: error,
        }
      )
      return new Response(genericError.message, {
        status: 502,
      })
    }
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

export default new ApiGatewayWorker(ApiGatewayWorker.getDefaultRouter())

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
