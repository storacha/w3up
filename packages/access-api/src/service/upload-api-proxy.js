import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { DID } from '@ucanto/core'
import * as HTTP from '@ucanto/transport/http'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { createProxyHandler } from '../ucanto/proxy.js'

/**
 * @typedef {import('../ucanto/types.js').InferService<Omit<import('@web3-storage/capabilities/store'), 'store'>>} StoreServiceInferred
 * @typedef {import('../ucanto/types.js').InferService<Omit<import('@web3-storage/capabilities/upload'), 'upload'>>} UploadServiceInferred
 */

/**
 * @template {string|number|symbol} M
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {Array<M>} options.methods
 * @param {{ default: Connection } & Record<Ucanto.UCAN.DID, Connection>} options.connections
 */
function createProxyService(options) {
  const handleInvocation = createProxyHandler(options)
  // eslint-disable-next-line unicorn/no-array-reduce
  const service = options.methods.reduce((obj, method) => {
    obj[method] = handleInvocation
    return obj
  }, /** @type {Record<M, typeof handleInvocation>} */ ({}))
  return service
}

/**
 * @typedef UcantoHttpConnectionOptions
 * @property {Ucanto.UCAN.DID} audience
 * @property {typeof globalThis.fetch} options.fetch
 * @property {URL} options.url
 */

/**
 * @param {UcantoHttpConnectionOptions} options
 * @returns {Ucanto.ConnectionView<any>}
 */
function createUcantoHttpConnection(options) {
  return Client.connect({
    id: DID.parse(options.audience),
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      fetch: options.fetch,
      url: options.url,
    }),
  })
}

const uploadApiEnvironments = {
  production: {
    audience: /** @type {const} */ ('did:web:web3.storage'),
    // dont use up.web3.storage because it won't resolve from inside cloudflare workers
    // until resolution of https://github.com/web3-storage/w3protocol/issues/363
    url: new URL('https://3bd9h7xn3j.execute-api.us-west-2.amazonaws.com/'),
  },
  staging: {
    audience: /** @type {const} */ ('did:web:staging.web3.storage'),
    url: new URL('https://staging.up.web3.storage'),
  },
}

/**
 * @typedef {keyof typeof uploadApiEnvironments} UploadApiEnvironmentName
 * @typedef {typeof uploadApiEnvironments[UploadApiEnvironmentName]['audience']} UploadApiAudience
 */

/**
 * @param {object} options
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {object} options.uploadApi
 * @param {URL} [options.uploadApi.production]
 * @param {URL} [options.uploadApi.staging]
 */
function getDefaultConnections(options) {
  const { fetch = globalThis.fetch.bind(globalThis), uploadApi } = options
  return {
    default: createUcantoHttpConnection({
      ...uploadApiEnvironments.production,
      ...(uploadApi.production && { url: uploadApi.production }),
      fetch,
    }),
    [uploadApiEnvironments.staging.audience]: createUcantoHttpConnection({
      ...uploadApiEnvironments.staging,
      url: uploadApi.staging ?? uploadApiEnvironments.staging.url,
      fetch,
    }),
  }
}

/**
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {{ default: Connection, [K: Ucanto.UCAN.DID]: Connection }} [options.connections]
 * @param {Record<Ucanto.UCAN.DID, URL>} [options.audienceToUrl]
 * @param {object} options.uploadApi
 * @param {URL} [options.uploadApi.production]
 * @param {URL} [options.uploadApi.staging]
 */
export function createUploadProxy(options) {
  return createProxyService({
    ...options,
    connections: options.connections || getDefaultConnections(options),
    methods: ['list', 'add', 'remove', 'upload'],
  })
}

/**
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {{ default: Connection, [K: Ucanto.UCAN.DID]: Connection }} [options.connections]
 * @param {Record<Ucanto.UCAN.DID, URL>} [options.audienceToUrl]
 * @param {object} options.uploadApi
 * @param {URL} [options.uploadApi.production]
 * @param {URL} [options.uploadApi.staging]
 */
export function createStoreProxy(options) {
  return createProxyService({
    ...options,
    connections: options.connections || getDefaultConnections(options),
    methods: ['list', 'add', 'remove', 'store'],
  })
}
