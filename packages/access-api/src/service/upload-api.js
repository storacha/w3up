/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-constructor */
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as dagUcan from '@ipld/dag-ucan'
import * as dagUcanDid from '@ipld/dag-ucan/did'
import * as HTTP from '@ucanto/transport/http'
import * as Store from '@web3-storage/capabilities/store'
// @ts-ignore
import * as ucanto from '@ucanto/core'
import * as iucanto from '@ucanto/interface'
// @ts-ignore
import * as ed25519 from '@ucanto/principal/ed25519'

/**
 * @template {iucanto.Capability} C
 * @callback StoreHandler
 * @param {iucanto.Invocation<C>} invocationIn
 * @param {iucanto.InvocationContext} context
 */

/**
 * @typedef StoreService
 * @property {StoreHandler<iucanto.InferInvokedCapability<typeof Store.list>>} list
 */

/**
 * @template {Record<string, any>} T
 * @param {object} options
 * @param {import('@ucanto/interface').Signer} options.signer
 * @param {Pick<Map<dagUcan.DID, iucanto.ConnectionView<T>>, 'get'>} options.connections
 */
function createProxyStoreService(options) {
  /**
   * @type {StoreService}
   */
  const store = {
    /**
     * @template {iucanto.InferInvokedCapability<typeof Store.list>} C
     * @param {iucanto.Invocation<C>} invocationIn
     * @param {iucanto.InvocationContext} context
     */
    list: async (invocationIn, context) => {
      const uploadApiConnection = options.connections.get(
        invocationIn.audience.did()
      )
      if (!uploadApiConnection) {
        throw new Error(
          `unable to get connection to upload-api for audience ${invocationIn.audience.did()}}`
        )
      }
      // build new invocation that delegates to custom signer
      /** @type {import('@ucanto/interface').IssuedInvocation<C>} */
      const proxyInvocation = Client.invoke({
        // this results in a forwarded invocation, but the upstream will reject the signature
        // created using options.signer
        // issuer: options.signer,
        // this works, but involves lying about the issuer (it wants a Signer but context.id is only a Verifier)
        // @Gozala can we make it so `import('@ucanto/interface').InvocationOptions['issuer']` can be a Verifier and not just Signer?
        issuer: /** @type {any} */ (context.id),
        capability: invocationIn.capabilities[0],
        audience: invocationIn.audience,
        proofs: [invocationIn],
      })
      const [result] = await Client.execute(
        [proxyInvocation],
        /** @type {Client.Connection<any>} */ (uploadApiConnection)
      )
      return result
    },
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
 * @implements {Pick<Map<dagUcan.DID, iucanto.Connection<any>>, 'get'>}
 */
class AudienceConnections {
  /** @type {Record<dagUcan.DID, URL>} */
  #audienceToUrl
  /** @type {undefined|import('@ucanto/interface').Connection<any>} */
  #defaultConnection
  /** @type {typeof globalThis.fetch} */
  #fetch

  /**
   * @param {UcantoHttpConnectionOptions} options
   * @returns {import('@ucanto/interface').Connection<any>}
   */
  static createConnection(options) {
    return Client.connect({
      id: dagUcanDid.parse(options.audience),
      encoder: CAR,
      decoder: CBOR,
      channel: HTTP.open({
        fetch: options.fetch,
        url: options.url,
      }),
    })
  }

  /**
   * @param {object} options
   * @param {Record<dagUcan.DID, URL>} options.audienceToUrl
   * @param {UcantoHttpConnectionOptions} [options.defaultConnection]
   * @param {typeof globalThis.fetch} options.fetch
   */
  constructor(options) {
    this.#fetch = options.fetch
    this.#audienceToUrl = options.audienceToUrl
    this.#defaultConnection = options.defaultConnection
      ? AudienceConnections.createConnection(options.defaultConnection)
      : undefined
  }

  /**
   * @param {dagUcan.DID} audience
   */
  get(audience) {
    if (audience in this.#audienceToUrl) {
      return AudienceConnections.createConnection({
        audience,
        fetch: this.#fetch,
        url: this.#audienceToUrl[audience],
      })
    }
    return this.#defaultConnection
  }
}

export class UploadApiProxyService {
  /** @type {StoreService} */
  store

  /**
   * @type {Record<string, {
   * audience: dagUcan.DID,
   * url: URL,
   * }>}
   */
  static #environments = {
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
   * @template {StoreService} T
   * @param {object} options
   * @param {import('@ucanto/interface').Signer} options.signer
   * @param {typeof globalThis.fetch} options.fetch
   */
  static forSigner(options) {
    // eslint-disable-next-line unicorn/no-array-reduce
    const audienceToUrl = Object.values(this.#environments).reduce(
      (acc, { audience, url }) => {
        acc[audience] = url
        return acc
      },
      /** @type {Record<dagUcan.DID, URL>} */ ({})
    )
    return new this(
      createProxyStoreService({
        signer: options.signer,
        connections: new AudienceConnections({
          audienceToUrl,
          defaultConnection: {
            fetch: options.fetch,
            ...this.#environments.production,
          },
          fetch: options.fetch,
        }),
      })
    )
  }

  /**
   * @protected
   * @param {StoreService} store
   */
  constructor(store) {
    this.store = store
  }
}
