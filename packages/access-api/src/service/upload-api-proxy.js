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
        // @todo obviate this type override via https://github.com/web3-storage/ucanto/issues/195
        /** @type {Ucanto.Signer} */ (context.id)

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
