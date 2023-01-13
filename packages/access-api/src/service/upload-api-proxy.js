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
 * @typedef StoreService
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Store.add>>} add
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Store.list>>} list
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Store.remove>>} remove
 */

/**
 * @typedef UploadService
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Upload.add>>} add
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Upload.list>>} list
 * @property {InvocationResponder<Ucanto.InferInvokedCapability<typeof Upload.remove>>} remove
 */

/**
 * @template {Record<string, any>} T
 * @param {object} options
 * @param {Ucanto.Signer} [options.signer]
 * @param {Pick<Map<dagUcan.DID, Ucanto.ConnectionView<T>>, 'get'>} options.connections
 */
function createProxyStoreService(options) {
  const handleInvocation = createProxyHandler(options)
  /**
   * @type {StoreService}
   */
  const store = {
    add: handleInvocation,
    list: handleInvocation,
    remove: handleInvocation,
  }
  return store
}

/**
 * @template {Record<string, any>} T
 * @param {object} options
 * @param {Ucanto.Signer} [options.signer]
 * @param {Pick<Map<dagUcan.DID, Ucanto.ConnectionView<T>>, 'get'>} options.connections
 */
function createProxyUploadService(options) {
  const handleInvocation = createProxyHandler(options)
  /**
   * @type {UploadService}
   */
  const store = {
    add: handleInvocation,
    list: handleInvocation,
    remove: handleInvocation,
  }
  return store
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

/**
 * @type {Record<string, {
 * audience: dagUcan.DID,
 * url: URL,
 * }>}
 */
const uploadApiEnvironments = {
  production: {
    audience: 'did:web:web3.storage',
    url: new URL('https://up.web3.storage'),
  },
  staging: {
    audience: 'did:web:staging.web3.storage',
    url: new URL('https://staging.up.web3.storage'),
  },
}

/**
 * @interface {Pick<Map<dagUcan.DID, Ucanto.Connection<any>>, 'get'>}
 */
const audienceConnections = {
  audienceToUrl: (() => {
    /** @type {{ [k: keyof typeof uploadApiEnvironments]: URL }} */
    const object = {}
    for (const [, { audience, url }] of Object.entries(uploadApiEnvironments)) {
      object[audience] = url
    }
    return object
  })(),
  fetch: globalThis.fetch,
  /** @type {undefined|Ucanto.DID} */
  defaultAudience: uploadApiEnvironments.production.audience,
  /**
   * Return a ucanto connection to use for the provided invocation audience.
   * If no connection is available for the provided audience, return a connection for the default audience.
   *
   * @param {dagUcan.DID} audience
   */
  get(audience) {
    const defaultedAudience =
      audience in this.audienceToUrl ? audience : this.defaultAudience
    if (!defaultedAudience) {
      return
    }
    const url = this.audienceToUrl[defaultedAudience]
    return createUcantoHttpConnection({
      audience: defaultedAudience,
      fetch: this.fetch,
      url,
    })
  },
}

export class UploadApiProxyService {
  /** @type {StoreService} */
  store
  /** @type {UploadService} */
  upload

  /**
   * @param {object} options
   * @param {Ucanto.Signer} [options.signer]
   * @param {typeof globalThis.fetch} options.fetch
   */
  static create(options) {
    const proxyOptions = {
      signer: options.signer,
      connections: {
        ...audienceConnections,
        ...(options.fetch && { fetch: options.fetch }),
      },
    }
    return new this(
      createProxyStoreService(proxyOptions),
      createProxyUploadService(proxyOptions)
    )
  }

  /**
   * @protected
   * @param {StoreService} store
   * @param {UploadService} upload
   */
  constructor(store, upload) {
    this.store = store
    this.upload = upload
  }
}
