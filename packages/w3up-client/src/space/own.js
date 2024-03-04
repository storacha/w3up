import * as API from '../types.js'
import * as Access from '../access.js'
import * as ED25519 from '@ucanto/principal/ed25519'
import * as BIP39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import * as SharedSpace from './shared.js'
import { delegate, UCAN } from '@ucanto/core'
import * as DB from '../agent/db.js'
import * as Session from './session.js'
import * as Authorization from '../authorization.js'
import * as Delegations from './delegations.js'

/**
 * @param {object} options
 * @param {string} options.name
 * @returns {API.OwnSpacePromise}
 */
export const create = ({ name }) =>
  OwnSpacePromise.from({ name, promise: ED25519.generate() })

/**
 * Recovers space from the saved mnemonic.
 *
 * @param {string} mnemonic
 * @param {object} options
 * @param {string} options.name - Name to give to the recovered space.
 */
export const fromMnemonic = async (mnemonic, { name }) => {
  const secret = BIP39.mnemonicToEntropy(mnemonic, wordlist)
  const signer = await ED25519.derive(secret)
  return new OwnSpace({ signer, name })
}

/**
 * Turns (owned) space into a BIP39 mnemonic that later can be used to recover
 * the space using `fromMnemonic` function.
 *
 * @param {object} space
 * @param {ED25519.EdSigner} space.signer
 */
export const toMnemonic = ({ signer }) => {
  /** @type {Uint8Array} */
  // @ts-expect-error - Field is defined but not in the interface
  const secret = signer.secret

  return BIP39.entropyToMnemonic(secret, wordlist)
}

/**
 * @param {API.OwnSpace} space
 * @param {object} access
 * @param {API.Signer} access.authority
 * @param {API.Can} [access.can]
 * @param {API.UTCUnixTimestamp} [access.expiration]
 * @returns {Promise<API.Result<API.SharedSpaceView, never>>}
 */
export const share = async ({ signer, name }, access) => {
  const result = await authorize({ signer, name }, access)
  return result.error
    ? result
    : {
        ok: SharedSpace.create({
          signer: access.authority,
          subject: signer.did(),
          name,
          proofs: result.ok.proofs,
        }),
      }
}

// Default authorization session is valid for 1 year
export const SESSION_LIFETIME = 60 * 60 * 24 * 365

/**
 * @param {object} access
 * @param {API.DID} access.subject
 * @param {API.Can} access.can
 * @returns {API.Capabilities}
 */
const toCapabilities = (access) => {
  const capabilities = []
  for (const [can, details] of Object.entries(access.can)) {
    if (details) {
      capabilities.push({ can, with: access.subject })
    }
  }

  return /** @type {API.Capabilities} */ (capabilities)
}

/**
 * Creates authorization that gives specified `access.agent` an access to
 * specified ability (passed as `access.can` field) on this space.
 * Optionally, you can specify `access.expiration` field to set the
 * expiration time for issued authorization. By default the authorization
 * is valid for 1 year and gives access to all {@link API.W3Protocol}
 * capabilities on the space that are needed to use the space.
 *
 * @param {API.OwnSpace} space
 * @param {object} access
 * @param {API.Principal} access.authority
 * @param {API.Can} [access.can]
 * @param {API.UTCUnixTimestamp} [access.expiration]
 * @returns {Promise<API.Result<API.Authorization, never>>}
 */
export const authorize = async (
  { signer, name },
  {
    authority,
    can = Access.spaceAccess,
    expiration = UCAN.now() + SESSION_LIFETIME,
  }
) => {
  const proof = await delegate({
    issuer: signer,
    audience: authority,
    capabilities: toCapabilities({ subject: signer.did(), can }),
    expiration,
    facts: [{ space: { name } }],
  })

  return {
    ok: Authorization.from({
      authority: authority.did(),
      subject: signer.did(),
      can,
      proofs: [proof],
    }),
  }
}

/**
 * Creates authorization that gives specified `access.agent` an access to
 * specified ability (passed as `access.can` field) on this space.
 * Optionally, you can specify `access.expiration` field to set the
 * expiration time for issued authorization. By default the authorization
 * is valid for 1 year and gives access to all {@link API.W3Protocol}
 * capabilities on the space that are needed to use the space.
 *
 * @param {API.OwnSpace} space
 * @param {object} access
 * @param {API.Principal} access.authority
 * @param {API.UTCUnixTimestamp} [access.expiration]
 * @returns {Promise<API.Result<API.Authorization, never>>}
 */ export const createRecovery = async (
  space,
  { authority, expiration = Infinity }
) => authorize(space, { can: Access.accountAccess, authority, expiration })

/**
 * @extends {Promise<API.Result<OwnSpace, never>>}
 * @implements {API.OwnSpacePromise}
 */
class OwnSpacePromise extends Promise {
  /**
   * @param {object} options
   * @param {string} options.name
   * @param {Promise<ED25519.EdSigner>} options.promise
   * @returns {API.OwnSpacePromise}
   */
  static from({ name, promise }) {
    return new OwnSpacePromise((resolve, reject) => {
      promise
        .then((signer) => {
          resolve({ ok: new OwnSpace({ name, signer }) })
        })
        .catch(reject)
    })
  }

  /**
   * Connects to a remote replica of the owned space so that it can be used to
   * query state of the replica and invoke actions on it.
   *
   * @template {API.SpaceProtocol & API.UsageProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {Promise<API.Result<API.OwnSpaceSession<Protocol>, never>>}
   */
  async connect(connection) {
    const result = await this
    if (result.ok) {
      return { ok: result.ok.connect(connection) }
    } else {
      return result
    }
  }
}

/**
 * Represents an owned space, meaning a space for which we have a private key
 * and consequently have full authority over.
 *
 * @implements {API.OwnSpaceView}
 */
class OwnSpace {
  /**
   * @param {object} model
   * @param {string} model.name
   * @param {ED25519.EdSigner} model.signer
   */
  constructor(model) {
    this.model = model
  }

  get signer() {
    return this.model.signer
  }

  get name() {
    return this.model.name
  }

  did() {
    return this.signer.did()
  }

  /**
   * Creates a renamed version of this space.
   *
   * @param {string} name
   */
  rename(name) {
    return new OwnSpace({ ...this.model, name })
  }

  /**
   * Derives BIP39 mnemonic that can be used to recover the space.
   *
   * @returns {string}
   */
  toMnemonic() {
    return toMnemonic(this.model)
  }

  /**
   * Connects to a remote replica of the owned space so that it can be used to
   * query state of the replica and invoke actions on it.
   *
   * @template {API.SpaceProtocol & API.UsageProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.OwnSpaceSession<Protocol>}
   */
  connect(connection) {
    return new OwnSpaceSession({
      session: {
        agent: { signer: this.signer, db: DB.from({ proofs: [] }) },
        connection,
      },
      name: this.name,
    })
  }

  /**
   * Shares access to this space with a session agent and returns a session
   * with a same connection and agent but scoped to this space with desired
   * access level.
   *
   * @param {API.Signer} authority
   * @param {object} access
   * @param {API.Can} access.can
   * @param {API.UTCUnixTimestamp} [access.expiration]
   */
  share(authority, access) {
    return share(this, { ...access, authority })
  }

  /**
   * @param {API.Principal} authority
   * @param {object} access
   * @param {API.UTCUnixTimestamp} [access.expiration]
   */
  createRecovery(authority, access) {
    return createRecovery(this, { ...access, authority })
  }

  /**
   * @param {API.Principal} authority
   * @param {API.ShareAccess} access
   */
  authorize(authority, access) {
    return authorize(this, { ...access, authority })
  }
}

/**
 * Represents a remote replica of the owned space. It can be used to query
 * state of the replica and invoke actions on it.
 *
 * @template {API.SpaceProtocol & API.UsageProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.OwnSpaceSession<Protocol>}
 */
class OwnSpaceSession {
  /**
   *
   * @param {object} model
   * @param {string} model.name
   * @param {API.Session<Protocol> & { agent: { signer: ED25519.EdSigner }}} model.session
   */
  constructor(model) {
    this.model = model

    this.delegations = Delegations.view(
      /** @type {API.SpaceSession<any>} */ (this)
    )
  }

  get signer() {
    return this.agent.signer
  }

  get agent() {
    return this.model.session.agent
  }

  get connection() {
    return this.model.session.connection
  }

  get name() {
    return this.model.name
  }

  did() {
    return /** @type {API.DIDKey} */ (this.agent.signer.did())
  }
  /**
   * Creates a renamed version of this space.
   *
   * @param {string} name
   * @returns {API.OwnSpaceSession<Protocol>}
   */
  rename(name) {
    return new OwnSpaceSession({ ...this.model, name })
  }

  /**
   * Derives BIP39 mnemonic that can be used to recover the space.
   *
   * @returns {string}
   */
  toMnemonic() {
    return toMnemonic({ signer: this.agent.signer })
  }

  /**
   * Shares access to this space with a session agent and returns a session
   * with a same connection and agent but scoped to this space with desired
   * access level.
   *
   * @param {API.Signer} authority
   * @param {object} access
   * @param {API.Can} [access.can]
   */
  async share(authority, { can } = {}) {
    const result = await share(this, { authority, can })
    if (result.error) {
      return result
    } else {
      return { ok: result.ok.connect(this.connection) }
    }
  }

  /**
   * @param {API.Principal} authority
   * @param {object} [access]
   * @param {API.UTCUnixTimestamp} [access.expiration]
   */
  createRecovery(authority, access = {}) {
    return authorize(this, { ...access, authority })
  }

  /**
   * @param {API.Principal} authority
   * @param {API.ShareAccess} [access]
   */
  authorize(authority, access) {
    return authorize(this, { ...access, authority })
  }

  info() {
    return Session.info(this)
  }
}
