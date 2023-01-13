import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
// eslint-disable-next-line no-unused-vars
import * as dagUcan from '@ipld/dag-ucan'
import { DID } from '@ucanto/core'
import * as HTTP from '@ucanto/transport/http'
// eslint-disable-next-line no-unused-vars
import * as Store from '@web3-storage/capabilities/store'
// eslint-disable-next-line no-unused-vars
import * as Upload from '@web3-storage/capabilities/upload'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { createProxyHandler } from '../ucanto/proxy.js'

/**
 * @template {Ucanto.Capability} C
 * @template [Success=unknown]
 * @template {{ error: true }} [Failure={error:true}]
 * @callback InvocationResponder
 * @param {Ucanto.Invocation<C>} invocationIn
 * @param {Ucanto.InvocationContext} context
 * @returns {Promise<Ucanto.Result<Success, Failure>>}
 */

/**
 * Select from T the property names whose values are of type V
 *
 * @template T
 * @template V
 * @typedef { { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T] } KeysWithValue
 */

/**
 * Select from T the entries where the vlaue is of type V
 *
 * @template T
 * @template V
 * @typedef { { [K in KeysWithValue<T,V>]: T[K] } } OnlyValuesOfType
 */

/**
 * @template {Record<string, unknown>} S
 * @typedef { { [K in KeysWithValue<S, Ucanto.TheCapabilityParser<any>>]: InvocationResponder<Ucanto.InferInvokedCapability<S[K] extends Ucanto.TheCapabilityParser<infer M> ? S[K] : never>> } } ModuleService
 */

/**
 * @typedef {ModuleService<Omit<Store, 'store'>>} StoreServiceInferred
 * @typedef {ModuleService<Upload>} UploadServiceInferred
 */

/**
 * @template {string|number|symbol} M
 * @param {object} options
 * @param {Ucanto.Signer} [options.signer]
 * @param {Array<M>} options.methods
 * @param {Pick<Map<dagUcan.DID, Ucanto.ConnectionView<Record<M, any>>>, 'get'>} options.connections
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
 * @property {dagUcan.DID} audience
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

// /**
//  * @param {object} options
//  * @param {Ucanto.Signer} [options.signer]
//  * @param {typeof globalThis.fetch} options.fetch
//  * @param {Record<Ucanto.UCAN.DID, URL>} [options.audienceToUrl]
//  * @returns
//  */
// export const createStoreService = (options) => {
//   return createProxyService({
//   connections:
//   methods: ['list', 'add', 'remove', 'store'],
// })
// }

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
  static create(options) {
    const defaultAudience = uploadApiEnvironments.production.audience
    const audienceToUrl = options.audienceToUrl || uploadApiAudienceToUrl
    const proxyOptions = {
      signer: options.signer,
      connections: {
        /** @param {Ucanto.DID} audience */
        get(audience) {
          const defaultedAudience =
            audience in audienceToUrl ? audience : defaultAudience
          return createUcantoHttpConnection({
            audience: defaultedAudience,
            fetch: options.fetch,
            url: audienceToUrl[defaultedAudience],
          })
        },
      },
    }
    const store = createProxyService({
      ...proxyOptions,
      methods: ['list', 'add', 'remove', 'store'],
    })
    const upload = createProxyService({
      ...proxyOptions,
      methods: ['list', 'add', 'remove', 'upload'],
    })
    return new this(store, upload)
  }

  /**
   * @protected
   * @param {StoreServiceInferred} store
   * @param {UploadServiceInferred} upload
   */
  constructor(store, upload) {
    this.store = store
    this.upload = upload
  }
}
