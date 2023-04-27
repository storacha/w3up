import * as Client from '@ucanto/client'
import { CAR } from '@ucanto/transport'
import { DID } from '@ucanto/core'
import * as HTTP from '@ucanto/transport/http'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { createProxyHandler } from '../ucanto/proxy.js'

/**
 * @typedef {import('../ucanto/types.js').InferService<Omit<import('@web3-storage/capabilities/store'), 'store'>>} StoreServiceInferred
 * @typedef {import('../ucanto/types.js').InferService<Omit<import('@web3-storage/capabilities/upload'), 'upload'>>} UploadServiceInferred
 * @typedef {{ store: StoreServiceInferred, upload: UploadServiceInferred }} Service
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
  }, /** @type {Record<M, Ucanto.ServiceMethod<Ucanto.Capability, Ucanto.Result, Ucanto.Failure>>} */ ({}))
  return service
}

/**
 * @typedef UcantoHttpConnectionOptions
 * @property {Ucanto.UCAN.DID} audience
 * @property {typeof globalThis.fetch} options.fetch
 * @property {URL} options.url
 */

/**
 * Create a ucanto connection to an upload api url.
 * Assumes upload-api at that URL decodes requests as CAR and encodes responses as CBOR.
 *
 * @param {UcantoHttpConnectionOptions} options
 */
export function createUploadApiConnection(options) {
  return Client.connect({
    id: DID.parse(options.audience),
    codec: CAR.outbound,
    channel: HTTP.open({
      fetch: options.fetch,
      url: options.url,
    }),
  })
}

/**
 * @param {object} options
 * @param {import('../bindings.js').RouteContext['uploadApi']} options.uploadApi
 */
export function createUploadProxy(options) {
  return createProxyService({
    ...options,
    connections: {
      default: options.uploadApi,
    },
    methods: ['list', 'add', 'remove', 'upload'],
  })
}

/**
 * @param {object} options
 * @param {import('../bindings.js').RouteContext['uploadApi']} options.uploadApi
 */
export function createStoreProxy(options) {
  return createProxyService({
    ...options,
    connections: {
      default: options.uploadApi,
    },
    methods: ['list', 'add', 'remove', 'store'],
  })
}
