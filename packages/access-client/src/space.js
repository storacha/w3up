import * as ED25519 from '@ucanto/principal/ed25519'
import { delegate, Schema, UCAN } from '@ucanto/core'
import * as BIP39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import * as API from './types.js'
import * as Access from './access.js'

/**
 * Data model for the (owned) space.
 *
 * @typedef {object} Model
 * @property {ED25519.EdSigner} signer
 * @property {string} name
 */

/**
 * Generates a new space.
 *
 * @param {object} options
 * @param {string} options.name
 */
export const generate = async ({ name }) => {
  const { signer } = await ED25519.generate()

  return new OwnedSpace({ signer, name })
}

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
  return new OwnedSpace({ signer, name })
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
 * Creates a (UCAN) delegation that gives full access to the space to the
 * specified `account`. At the moment we only allow `did:mailto` principal
 * to be used as an `account`.
 *
 * @param {Model} space
 * @param {API.AccountDID} account
 */
export const createRecovery = (space, account) =>
  createAuthorization(space, {
    agent: space.signer.withDID(account),
    access: Access.accountAccess,
    expiration: Infinity,
  })

// Default authorization session is valid for 1 year
export const SESSION_LIFETIME = 60 * 60 * 24 * 365

/**
 * Creates (UCAN) delegation that gives specified `agent` an access to
 * specified ability (passed as `access.can` field) on the this space.
 * Optionally, you can specify `access.expiration` field to set the
 * expiration time for the authorization. By default the authorization
 * is valid for 1 year and gives access to all capabilities on the space
 * that are needed to use the space.
 *
 * @param {Model} space
 * @param {object} options
 * @param {API.Principal} options.agent
 * @param {API.Access} [options.access]
 * @param {API.UTCUnixTimestamp} [options.expiration]
 */
export const createAuthorization = async (
  { signer, name },
  {
    agent,
    access = Access.spaceAccess,
    expiration = UCAN.now() + SESSION_LIFETIME,
  }
) => {
  return await delegate({
    issuer: signer,
    audience: agent,
    capabilities: toCapabilities({
      [signer.did()]: access,
    }),
    ...(expiration ? { expiration } : {}),
    facts: [{ space: { name } }],
  })
}

/**
 * @param {Record<API.Resource, API.Access>} allow
 * @returns {API.Capabilities}
 */
const toCapabilities = (allow) => {
  const capabilities = []
  for (const [subject, access] of Object.entries(allow)) {
    const entries = /** @type {[API.Ability, API.Unit][]} */ (
      Object.entries(access)
    )

    for (const [can, details] of entries) {
      if (details) {
        capabilities.push({ can, with: subject })
      }
    }
  }

  return /** @type {API.Capabilities} */ (capabilities)
}

/**
 * Represents an owned space, meaning a space for which we have a private key
 * and consequently have full authority over.
 */
class OwnedSpace {
  /**
   * @param {Model} model
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
  withName(name) {
    return new OwnedSpace({ signer: this.signer, name })
  }

  /**
   * Creates a (UCAN) delegation that gives full access to the space to the
   * specified `account`. At the moment we only allow `did:mailto` principal
   * to be used as an `account`.
   *
   * @param {API.AccountDID} account
   */
  async createRecovery(account) {
    return createRecovery(this, account)
  }

  /**
   * Creates (UCAN) delegation that gives specified `agent` an access to
   * specified ability (passed as `access.can` field) on the this space.
   * Optionally, you can specify `access.expiration` field to set the
   *
   * @param {API.Principal} agent
   * @param {object} [input]
   * @param {API.Access} [input.access]
   * @param {API.UCAN.UTCUnixTimestamp} [input.expiration]
   */
  createAuthorization(agent, input) {
    return createAuthorization(this, { ...input, agent })
  }

  /**
   * Derives BIP39 mnemonic that can be used to recover the space.
   *
   * @returns {string}
   */
  toMnemonic() {
    return toMnemonic(this)
  }
}

const SpaceDID = Schema.did({ method: 'key' })

/**
 * Creates a (shared) space from given delegation.
 *
 * @param {API.Delegation} delegation
 */
export const fromDelegation = (delegation) => {
  const result = SpaceDID.read(delegation.capabilities[0].with)
  if (result.error) {
    throw Object.assign(
      new Error(
        `Invalid delegation, expected capabilities[0].with to be DID, ${result.error}`
      ),
      {
        cause: result.error,
      }
    )
  }

  /** @type {{name?:string}} */
  const meta = delegation.facts[0]?.space ?? {}

  return new SharedSpace({ id: result.ok, delegation, meta })
}

/**
 * Represents a shared space, meaning a space for which we have a delegation
 * and consequently have limited authority over.
 */
class SharedSpace {
  /**
   * @typedef {object} SharedSpaceModel
   * @property {API.SpaceDID} id
   * @property {API.Delegation} delegation
   * @property {{name?:string}} meta
   *
   * @param {SharedSpaceModel} model
   */
  constructor(model) {
    this.model = model
  }

  get delegation() {
    return this.model.delegation
  }

  get meta() {
    return this.model.meta
  }

  get name() {
    return this.meta.name ?? ''
  }

  did() {
    return this.model.id
  }

  /**
   * @param {string} name
   */
  withName(name) {
    return new SharedSpace({
      ...this.model,
      meta: { ...this.meta, name },
    })
  }
}
