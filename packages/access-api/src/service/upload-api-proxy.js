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
// eslint-disable-next-line no-unused-vars
import * as ed25519 from '@ucanto/principal/ed25519'

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
 * @template {Ucanto.Capability} C
 * @template [Success=unknown]
 * @template {{ error: true }} [Failure={error:true}]
 * @param {object} options
 * @param {Pick<Map<dagUcan.DID, Ucanto.ConnectionView<any>>, 'get'>} options.connections
 * @param {Ucanto.Signer} [options.signer]
 * @returns {InvocationResponder<C, Success, Failure>}
 */
function createInvocationResponder(options) {
  /**
   * @template {import('@ucanto/interface').Capability} Capability
   * @param {Ucanto.Invocation<Capability>} invocationIn
   * @param {Ucanto.InvocationContext} context
   * @returns {Promise<Ucanto.Result<any, { error: true }>>}
   */
  return async function handleInvocation(invocationIn, context) {
    const connection = options.connections.get(invocationIn.audience.did())
    if (!connection) {
      throw new Error(
        `unable to get connection for audience ${invocationIn.audience.did()}}`
      )
    }
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
    const proxyInvocationIssuer = options.signer
      ? // this results in a forwarded invocation, but the upstream will reject the signature
        // created using options.signer unless options.signer signs w/ the same private key as the original issuer
        // and it'd be nice to not even have to pass around `options.signer`
        options.signer
      : // this works, but involves lying about the issuer type (it wants a Signer but context.id is only a Verifier)
        // @Gozala can we make it so `Ucanto.InvocationOptions['issuer']` can be a Verifier and not just Signer?
        /** @type {ed25519.Signer.Signer} */ (context.id)

    const [result] = await Client.execute(
      [
        Client.invoke({
          issuer: proxyInvocationIssuer,
          capability: invocationIn.capabilities[0],
          audience: invocationIn.audience,
          proofs: [invocationIn],
        }),
      ],
      /** @type {Client.ConnectionView<any>} */ (connection)
    )
    return result
  }
}

/**
 * @template {Record<string, any>} T
 * @param {object} options
 * @param {Ucanto.Signer} [options.signer]
 * @param {Pick<Map<dagUcan.DID, Ucanto.ConnectionView<T>>, 'get'>} options.connections
 */
function createProxyStoreService(options) {
  const handleInvocation = createInvocationResponder(options)
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
  const handleInvocation = createInvocationResponder(options)
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
 * @implements {Pick<Map<dagUcan.DID, Ucanto.Connection<any>>, 'get'>}
 */
class AudienceConnections {
  /** @type {Record<dagUcan.DID, URL>} */
  #audienceToUrl
  /** @type {undefined|Ucanto.ConnectionView<any>} */
  #defaultConnection
  /** @type {typeof globalThis.fetch} */
  #fetch

  /**
   * @param {UcantoHttpConnectionOptions} options
   * @returns {Ucanto.ConnectionView<any>}
   */
  static createConnection(options) {
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
  /** @type {UploadService} */
  upload

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
   * @param {object} options
   * @param {Ucanto.Signer} [options.signer]
   * @param {typeof globalThis.fetch} options.fetch
   */
  static create(options) {
    // eslint-disable-next-line unicorn/no-array-reduce
    const audienceToUrl = Object.values(this.#environments).reduce(
      (acc, { audience, url }) => {
        acc[audience] = url
        return acc
      },
      /** @type {Record<dagUcan.DID, URL>} */ ({})
    )
    const connections = new AudienceConnections({
      audienceToUrl,
      defaultConnection: {
        fetch: options.fetch,
        ...this.#environments.production,
      },
      fetch: options.fetch,
    })
    const proxyOptions = {
      signer: options.signer,
      connections,
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

/**
 * Return whether the provided stack trace string appears to be generated
 * by a deployed upload-api.
 * Heuristics:
 * * stack trace files paths will start with `file:///var/task/upload-api` because of how the lambda environment is working
 *
 * @param {string} stack
 */
export function isUploadApiStack(stack) {
  return stack.includes('file:///var/task/upload-api')
}
