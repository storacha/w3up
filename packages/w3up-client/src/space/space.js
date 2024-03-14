import * as API from '../types.js'
import * as DB from '../agent/db.js'
import * as Usage from './usage.js'
import * as Delegations from './delegations.js'
import * as Filecoin from './filecoin.js'
import * as Session from '../session.js'
import * as Task from '../task.js'
import * as Authorization from '../authorization.js'
import * as Agent from '../agent.js'
import * as Space from '@web3-storage/capabilities/space'
import { delegate, UCAN } from '@ucanto/core'
import * as Access from '../access.js'
import * as ED25519 from '@ucanto/principal/ed25519'
import * as BIP39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import * as Connection from '../agent/connection.js'

const offline = {
  connection: /** @type {API.Connection<any>} */ (Connection.offline),
}

/**
 * @template {SpaceProtocol} Protocol
 * @typedef {object} Model
 * @property {API.Session<Protocol>} session
 * @property {API.DIDKey} subject
 * @property {string} name
 * @property {API.Signer} signer
 * @property {API.Delegation[]} proofs
 */

/**
 * @template {SpaceProtocol} Protocol
 * @param {Model<Protocol>} model
 * @returns {API.SpaceView}
 */
export const view = ({ name, subject, session, signer, proofs }) =>
  new SpaceView({
    name,
    subject,
    session: {
      connection: session.connection,
      agent: { signer, db: DB.from({ proofs }) },
    },
  })

/**
 * @template {SpaceProtocol} Protocol
 * @param {object} options
 * @param {string} options.name
 * @param {{connection: API.Connection<Protocol>}} [options.session]
 * @returns {Task.Task<API.OwnSpaceView>}
 */
export function* create({ name, session = offline }) {
  const signer = yield* Task.wait(ED25519.generate())
  const agent = { signer, db: DB.from({ proofs: [] }) }
  return new OwnSpace({
    name,
    session: { agent, connection: session.connection },
  })
}

/**
 * Recovers space from the saved mnemonic.
 *
 * @template {SpaceProtocol} Protocol
 * @param {string} mnemonic
 * @param {object} options
 * @param {string} options.name - Name to give to the recovered space.
 * @param {{connection: API.Connection<Protocol>}} options.session
 * @returns {Task.Task<API.OwnSpaceView>}
 */
export function* fromMnemonic(mnemonic, { name, session = offline }) {
  const secret = BIP39.mnemonicToEntropy(mnemonic, wordlist)
  const signer = yield* Task.wait(ED25519.derive(secret))
  const agent = { signer, db: DB.from({ proofs: [] }) }
  return new OwnSpace({
    name,
    session: { agent, connection: session.connection },
  })
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
 * Protocol that session endpoint should implement to provide all of the
 * functionality.
 *
 * @typedef {API.UsageProtocol & API.SpaceProtocol & API.AccessProtocol & API.FilecoinProtocol} SpaceProtocol
 */

/**
 * @template {SpaceProtocol} Protocol
 * @param {API.SpaceSession<Protocol>} space
 * @param {API.ShareAccess} access
 * @returns {Task.Task<API.SpaceView, API.AccessDenied>}
 */
export function* share(space, access) {
  const { proofs } = yield* authorize(space, access)
  return new SpaceView({
    name: space.name,
    subject: space.did(),
    session: {
      agent: {
        signer: access.audience,
        db: DB.from({ proofs }),
      },
      connection: space.connection,
    },
  })
}

export const SESSION_LIFETIME = 60 * 60 * 24 * 365

/**
 *
 * Get Space information from Access service
 *
 * @param {API.SpaceSession<API.SpaceProtocol>} session
 * @nreturns {Task.Task<API.Receipt<API.SpaceInfoResult, API.SpaceInfoFailure | API.InvocationError>, API.AccessDenied | API.OfflineError>}
 */
export function* info(session) {
  const { proofs } = yield* Agent.authorize(session.agent, {
    subject: session.did(),
    can: { 'space/info': [] },
  })

  const task = Space.info.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: session.did(),
    proofs,
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * Creates authorization that gives specified `access.authority` an access to
 * specified ability (passed as `access.can` field) on the given space.
 *
 * Optionally, you can specify `access.expiration` field to set the
 * expiration time for issued authorization. By default the authorization
 * is valid for 1 year and gives access to all {@link API.W3UpProtocol}
 * capabilities on the space that are needed to use this space.
 *
 * @param {API.SpaceSession<API.SpaceProtocol>} space
 * @param {API.SpaceAccess} access
 * @returns {Task.Task<API.Authorization, API.AccessDenied>}
 */
export function* authorize(
  space,
  {
    audience,
    can = Access.spaceAccess,
    expiration = UCAN.now() + SESSION_LIFETIME,
    notBefore,
  }
) {
  const proofs = []

  // If the issuer different from the space did, we need to find proofs
  // for the issuer to be able to delegate access to the space.
  if (space.did() !== space.agent.signer.did()) {
    const authorization = yield* Agent.authorize(space.agent, {
      subject: space.did(),
      can: can,
    })
    proofs.push(...authorization.proofs)
  }

  const proof = yield* Task.wait(
    delegate({
      issuer: space.agent.signer,
      audience,
      capabilities: toCapabilities({ subject: space.did(), can }),
      expiration,
      notBefore,
      facts: [{ space: { name: space.name } }],
      proofs,
    })
  )

  return Authorization.from({
    authority: audience.did(),
    subject: space.did(),
    can,
    proofs: [proof],
  })
}

/**
 * Creates authorization that gives specified `access.agent` an access to
 * specified ability (passed as `access.can` field) on this space.
 * Optionally, you can specify `access.expiration` field to set the
 * expiration time for issued authorization. By default the authorization
 * is valid for 1 year and gives access to all {@link API.W3UpProtocol}
 * capabilities on the space that are needed to use the space.
 *
 * @template {SpaceProtocol} Protocol
 * @param {API.SpaceSession<Protocol>} space
 * @param {API.SpaceRecovery} access
 
 * @returns {Task.Task<API.Authorization, API.AccessDenied>}
 */
export function* createRecovery(space, access) {
  return yield* authorize(space, {
    ...access,
    can: Access.accountAccess,
  })
}

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
 * @template {SpaceProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.SpaceView}
 * @implements {API.SpaceSession<Protocol>}
 */
class SpaceView {
  /**
   * @param {object} model
   * @param {API.DIDKey} model.subject
   * @param {string} model.name
   * @param {API.Session<Protocol>} model.session
   */
  constructor(model) {
    this.model = model
    this.usage = Usage.view(this)
    this.delegations = Delegations.view(this)
    this.filecoin = Filecoin.view(this)
  }
  get connection() {
    return this.model.session.connection
  }
  get agent() {
    return this.model.session.agent
  }
  get authority() {
    return this.agent.signer.did()
  }
  get name() {
    return this.model.name
  }
  did() {
    return this.model.subject
  }

  /**
   *
   * @param {API.SpaceAccess} access
   */
  authorize(access) {
    return Task.perform(authorize(this, access))
  }

  /**
   * Returns replica of this space connected to the given connection.
   *
   * @template {SpaceProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.SpaceView}
   */
  connect(connection) {
    return new SpaceView({
      ...this.model,
      session: { ...this.model.session, connection },
    })
  }

  /**
   * @param {API.ShareAccess} access
   */
  share(access) {
    return Task.perform(share(this, access))
  }

  get proofs() {
    return [...this.agent.db.proofs.values()].map(($) => $.delegation)
  }

  info() {
    return Session.perform(info(this))
  }
}

/**
 * Represents an owned space, meaning a space for which we have a private key
 * and consequently have full authority over.
 *
 * @template {SpaceProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.OwnSpaceView}
 * @implements {API.SpaceView}
 * @implements {API.SpaceSession<Protocol>}
 */
class OwnSpace {
  /**
   * @param {object} model
   * @param {string} model.name
   * @param {API.Session<Protocol> & { agent: {signer: ED25519.EdSigner} }} model.session
   */
  constructor(model) {
    this.model = model

    this.usage = Usage.view(this)
    this.delegations = Delegations.view(this)
    this.filecoin = Filecoin.view(this)
  }
  get connection() {
    return this.model.session.connection
  }
  get agent() {
    return this.model.session.agent
  }
  get authority() {
    return this.agent.signer.did()
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
    return toMnemonic(this.model.session.agent)
  }

  /**
   * Connects to a remote replica of the owned space so that it can be used to
   * query state of the replica and invoke actions on it.
   *
   * @template {SpaceProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.OwnSpaceView}
   */
  connect(connection) {
    return new OwnSpace({
      ...this.model,
      session: {
        ...this.model.session,
        connection,
      },
    })
  }

  /**
   * Shares access to this space with a session agent and returns a session
   * with a same connection and agent but scoped to this space with desired
   * access level.
   *
   * @param {API.ShareAccess} access
   */
  share(access) {
    return Task.perform(share(this, access))
  }

  /**
   * @param {API.SpaceRecovery} access
   */
  createRecovery(access) {
    return Task.perform(createRecovery(this, access))
  }

  /**
   * @param {API.SpaceAccess} access
   */
  authorize(access) {
    return Task.perform(authorize(this, access))
  }

  info() {
    return Session.perform(info(this))
  }

  get proofs() {
    return [...this.agent.db.proofs.values()].map(($) => $.delegation)
  }
}
