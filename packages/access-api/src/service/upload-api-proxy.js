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
 * @typedef {import('../ucanto/types.js').InferService<import('@web3-storage/capabilities/upload')>} UploadServiceInferred
 */

/**
 * @template {string|number|symbol} M
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {Ucanto.Signer} [options.signer]
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
    url: new URL('https://up.web3.storage'),
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

/** @type {{ [k in uploadApiEnvironments[UploadApiEnvironmentName]['audience']]: URL }} */
export const uploadApiAudienceToUrl = (() => {
  const environments = Object.values(uploadApiEnvironments)
  // eslint-disable-next-line unicorn/no-array-reduce
  const object = environments.reduce((map, env) => {
    map[env.audience] = env.url
    return map
  }, /** @type {Record<UploadApiAudience, URL>} */ ({}))
  return object
})()

export class UploadApiProxyService {
  /** @type {StoreServiceInferred} */
  store
  /** @type {UploadServiceInferred} */
  upload

  /**
   * @param {object} options
   * @param {Ucanto.Signer} [options.signer]
   * @param {typeof globalThis.fetch} options.fetch
   * @param {Record<Ucanto.UCAN.DID, URL>} [options.audienceToUrl]
   */
  constructor(options) {
    const proxyOptions = {
      signer: options.signer,
      connections: {
        default: createUcantoHttpConnection({
          ...uploadApiEnvironments.production,
          fetch: options.fetch,
        }),
        [uploadApiEnvironments.staging.audience]: createUcantoHttpConnection({
          ...uploadApiEnvironments.staging,
          fetch: options.fetch,
        }),
      },
    }
    this.store = createProxyService({
      ...proxyOptions,
      methods: ['list', 'add', 'remove', 'store'],
    })
    this.upload = createProxyService({
      ...proxyOptions,
      methods: ['list', 'add', 'remove', 'upload'],
    })
  }
}
