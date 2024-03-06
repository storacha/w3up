import * as API from './types.js'
import { sha256, delegate, Delegation } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import * as Result from './result.js'
import * as Agent from './agent.js'
import * as Task from './task.js'
import * as Space from './space.js'
import * as Account from './account.js'

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Session<Protocol>} session
 * @returns {API.CouponAPI<Protocol>}
 */
export const view = (session) => new CouponAPI(session)

/**
 * @template {API.UnknownProtocol} Protocol
 * @implements {API.CouponAPI<Protocol>}
 */
class CouponAPI {
  /**
   * @param {API.Session<Protocol>} session
   */
  constructor(session) {
    this.session = session
  }

  /**
   * Redeems coupon from the the the archive. Throws an error if the coupon
   * password is invalid or if provided archive is not a valid.
   *
   * @param {Uint8Array} coupon
   * @param {object} [options]
   * @param {string} [options.secret]
   */
  async open(coupon, options = {}) {
    const result = await open(coupon, { ...options })
    if (result.error) {
      return result
    } else {
      return { ok: result.ok.connect(this.session.connection) }
    }
  }

  /**
   * Redeems coupon from the the the archive. Throws an error if the coupon
   * password is invalid or if provided archive is not a valid.
   *
   * @param {Uint8Array} coupon
   * @param {object} [options]
   * @param {string} [options.secret]
   * @returns {Promise<API.Result<API.CouponSession<Protocol>, Error>>}
   */
  async redeem(coupon, options = {}) {
    const result = await open(coupon, { ...options })
    if (result.error) {
      return result
    } else {
      return await redeem(result.ok, { session: this.session })
    }
  }

  /**
   * Issues a coupon for the given delegation.
   *
   * @param {object} access
   * @param {API.DID} access.subject
   * @param {API.Can} access.can
   * @param {API.UTCUnixTimestamp} [access.expiration]
   * @param {API.UTCUnixTimestamp} [access.notBefore]
   * @param {string} [access.secret]
   * @returns {Promise<API.Result<API.CouponSession<Protocol>, Error>>}
   */
  async issue(access) {
    const result = await issue(this.session.agent, access)
    if (result.error) {
      return result
    } else {
      return { ok: result.ok.connect(this.session.connection) }
    }
  }

  /**
   * @param {API.Coupon} coupon
   */
  add(coupon) {
    return add(this.session, coupon)
  }
  /**
   * @param {API.Coupon} coupon
   */
  remove(coupon) {
    return remove(this.session, coupon)
  }
}

/**
 * @param {{agent: API.Agent}} session
 * @param {API.Coupon} coupon
 */
export const remove = ({ agent }, coupon) =>
  Agent.DB.transact(
    agent.db,
    coupon.proofs.map((proof) => Agent.DB.retract({ proof }))
  )

/**
 * @param {{agent: API.Agent}} session
 * @param {API.Coupon} coupon
 */
export const add = async ({ agent }, coupon) => {
  if (coupon.signer.did() === agent.signer.did()) {
    return await Agent.DB.transact(
      agent.db,
      coupon.proofs.map((proof) => Agent.DB.assert({ proof }))
    )
  } else {
    return {
      error: new RangeError(
        `Space is shared with ${coupon.signer.did()} not ${agent.signer.did()}`
      ),
    }
  }
}

/**
 * Encodes coupon into an archive.
 *
 * @param {API.Coupon} coupon
 */
export const archive = async (coupon) => {
  const [delegation] = coupon.proofs
  return await Delegation.archive(delegation)
}

/**
 * Issues a coupon for the given delegation.
 *
 * @param {API.Agent} agent
 * @param {object} access
 * @param {API.DID} access.subject
 * @param {API.Can} access.can
 * @param {API.UTCUnixTimestamp} [access.expiration]
 * @param {API.UTCUnixTimestamp} [access.notBefore]
 * @param {string} [access.secret]
 * @returns {Promise<API.Result<Coupon, Error>>}
 */
export const issue = async (
  agent,
  { secret = '', subject, can, ...options }
) => {
  const authorization = Agent.authorize(agent, {
    subject,
    can,
  })
  if (authorization.error) {
    return authorization
  }

  const audience = await deriveSigner(secret)

  const capabilities = /** @type {API.Capabilities} */ (
    Object.entries(can).map(([can, policy]) => ({
      with: subject,
      can,
      nb: policy,
    }))
  )

  const delegation = await delegate({
    ...options,
    issuer: agent.signer,
    audience,
    capabilities,
    proofs: authorization.ok.proofs,
  })

  const coupon = new Coupon({
    signer: audience,
    db: Agent.DB.from({ proofs: [delegation] }),
  })

  return { ok: coupon }
}

/**
 *
 * @param {Uint8Array} archive
 * @param {object} [options]
 * @param {string} [options.secret]
 * @returns {Promise<API.Result<API.CouponView, Error>>}
 */
export const open = (archive, { secret = '' } = {}) =>
  Task.try(function* () {
    const proof = yield* Task.join(Delegation.extract(archive))
    const signer = yield* Task.wait(deriveSigner(secret))

    if (proof.audience.did() !== signer.did()) {
      return Result.error(
        new RangeError(
          secret === ''
            ? 'Extracting account requires a secret'
            : 'Provided secret is invalid'
        )
      )
    }

    const coupon = new Coupon({
      signer,
      db: Agent.DB.from({ proofs: [proof] }),
    })

    return Result.ok(coupon)
  })

/**
 * Redeems granted access with the given agent from the given coupon.
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Coupon} coupon
 * @param {object} options
 * @param {API.Session<Protocol>} options.session
 * @returns {Promise<API.Result<API.CouponSession<Protocol>, Error>>}
 */
export const redeem = async (coupon, { session }) => {
  const [delegation] = coupon.proofs

  const proof = await delegate({
    issuer: coupon.signer,
    audience: session.agent.signer,
    capabilities: delegation.capabilities,
    expiration: delegation.expiration,
    notBefore: delegation.notBefore,
    proofs: [delegation],
  })

  const db = Agent.DB.from({ proofs: [proof] })
  return Result.ok(
    new CouponSession({
      agent: { signer: session.agent.signer, db },
      connection: session.connection,
    })
  )
}

/**
 * @param {string} password
 */
const deriveSigner = async (password) => {
  const { digest } = await sha256.digest(new TextEncoder().encode(password))
  return await ed25519.Signer.derive(digest)
}

/**
 * @implements {API.Coupon}
 */
export class Coupon {
  /**
   * @param {API.Agent} model
   */
  constructor(model) {
    this.model = model
  }
  get signer() {
    return this.model.signer
  }

  get proofs() {
    return /** @type {[API.Delegation]} */ (
      [...this.model.db.proofs.values()].map(({ delegation }) => delegation)
    )
  }

  archive() {
    return archive(this)
  }

  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.CouponSession<Protocol>}
   */
  connect(connection) {
    return new CouponSession({
      agent: this.model,
      connection,
    })
  }
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.CouponSession<Protocol>}
 */
class CouponSession {
  /**
   * @param {API.Session<Protocol>} model
   */
  constructor(model) {
    this.model = model
    this.spaces = Space.view(/** @type {API.Session<any>} */ (this.model))
    this.accounts = Account.view(/** @type {API.Session<any>} */ (this.model))
  }
  get signer() {
    return this.model.agent.signer
  }
  get connection() {
    return this.model.connection
  }
  get agent() {
    return this.model.agent
  }

  get proofs() {
    return /** @type {[API.Delegation]} */ (
      [...this.model.agent.db.proofs.values()].map(
        ({ delegation }) => delegation
      )
    )
  }

  archive() {
    return archive(this)
  }
  /**
   * @param {object} options
   * @param {API.Agent} options.agent
   */
  redeem({ agent }) {
    return redeem(this, {
      session: { agent, connection: this.connection },
    })
  }
}
