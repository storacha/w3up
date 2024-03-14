import * as API from '../types.js'
import * as Task from '../task.js'
import { sha256, delegate, Delegation } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import * as Space from '../space.js'
import * as Account from '../account.js'
import * as Agent from '../agent.js'

/**
 * @param {string} password
 * @returns {Task.Task<ed25519.EdSigner, Error | Task.AbortError>}
 */
const deriveSigner = function* (password) {
  const { digest } = yield* Task.wait(
    sha256.digest(new TextEncoder().encode(password))
  )

  return yield* Task.wait(ed25519.Signer.derive(digest))
}

/**
 * Encodes coupon into an archive.
 *
 * @param {API.Coupon} coupon
 * @returns {Task.Task<Uint8Array, Error | Task.AbortError>}
 */
export function* archive(coupon) {
  const [delegation] = coupon.proofs
  return yield* Task.ok.wait(Delegation.archive(delegation))
}

/**
 * Extracts a coupon from provided `archive`. If issued coupon used a `secret`
 * it must be provided.
 *
 * @param {Uint8Array} archive
 * @param {object} [options]
 * @param {string} [options.secret]
 * @returns {Task.Task<API.CouponView, RangeError|API.Failure>}
 */
export function* open(archive, { secret = '' } = {}) {
  const proof = yield* Task.ok.wait(Delegation.extract(archive))
  const signer = yield* deriveSigner(secret)

  if (proof.audience.did() !== signer.did()) {
    return yield* Task.fail(
      new RangeError(
        secret === ''
          ? 'Redeeming a coupon requires a secret'
          : 'Provided secret is invalid'
      )
    )
  }

  return CouponView.from({ signer, proofs: [proof] })
}

/**
 * Redeems granted access with the given agent from the given coupon.
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Coupon} coupon
 * @param {object} options
 * @param {API.Session<Protocol>} options.session
 * @returns {Task.Task<API.CouponSession<Protocol>, Error | Task.AbortError>}
 */
export function* redeem(coupon, { session }) {
  if (coupon.signer.did() === session.agent.signer.did()) {
    const { agent } = CouponView.from(coupon)

    return new CouponSession({
      agent,
      connection: session.connection,
    })
  } else {
    const [delegation] = coupon.proofs

    const proof = yield* Task.wait(
      delegate({
        issuer: coupon.signer,
        audience: session.agent.signer,
        capabilities: delegation.capabilities,
        expiration: delegation.expiration,
        notBefore: delegation.notBefore,
        proofs: [delegation],
      })
    )

    const { agent } = CouponView.from({
      signer: session.agent.signer,
      proofs: [proof],
    })

    return new CouponSession({
      agent,
      connection: session.connection,
    })
  }
}

/**
 * Describes capabilities granted by the coupon.
 *
 * @typedef {object} Access
 * @property {API.DID} subject
 * @property {API.Can} can
 * @property {API.UTCUnixTimestamp} [expiration]
 * @property {API.UTCUnixTimestamp} [notBefore]
 * @property {string} [secret]
 */

/**
 * Issues a coupon for the given delegation.
 *
 * @param {API.Agent} agent
 * @param {Access} access
 * @returns {Task.Task<CouponView, Error|Task.AbortError>}
 */
export function* issue(agent, { secret = '', subject, can, ...options }) {
  const authorization = yield* Agent.authorize(agent, {
    subject,
    can,
  })

  const audience = yield* deriveSigner(secret)

  const capabilities = /** @type {API.Capabilities} */ (
    Object.entries(can).map(([can, policy]) => ({
      with: subject,
      can,
      nb: policy,
    }))
  )

  const delegation = yield* Task.wait(
    delegate({
      ...options,
      issuer: agent.signer,
      audience,
      capabilities,
      proofs: authorization.proofs,
    })
  )

  return new CouponView({
    signer: audience,
    db: Agent.DB.from({ proofs: [delegation] }),
  })
}

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Agent} agent
 * @param {API.Connection<Protocol>} connection
 * @returns {API.CouponSession<Protocol>}
 */
export const connect = (agent, connection) => {
  return new CouponSession({
    agent,
    connection,
  })
}

/**
 * @implements {API.Coupon}
 * @implements {API.CouponView}
 */
export class CouponView {
  /**
   * @param {API.Coupon} coupon
   */
  static from(coupon) {
    if (coupon instanceof CouponView) {
      return coupon
    } else {
      return new this({
        signer: coupon.signer,
        db: Agent.DB.from({ proofs: coupon.proofs }),
      })
    }
  }
  /**
   * @param {API.Agent} model
   */
  constructor(model) {
    this.model = model
  }
  get agent() {
    return this.model
  }
  get signer() {
    return this.model.signer
  }

  get proofs() {
    return /** @type {[API.Delegation]} */ (
      [...this.model.db.proofs.values()].map(({ delegation }) => delegation)
    )
  }

  /**
   *
   * @returns {Task.Invocation<Uint8Array, Error | Task.AbortError>}
   */
  archive() {
    return Task.perform(archive(this))
  }

  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.CouponSession<Protocol>}
   */
  connect(connection) {
    return connect(this.model, connection)
  }

  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.Session<Protocol>} session
   * @returns {Task.Invocation<API.CouponSession<Protocol>, Error | Task.AbortError>}
   */
  redeem(session) {
    return Task.perform(redeem(this, { session }))
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
    return Task.perform(archive(this))
  }

  /**
   * @param {object} options
   * @param {API.Agent} options.agent
   * @param {API.Connection<Protocol>} [options.connection]
   */
  redeem({ agent, connection = this.connection }) {
    return Task.perform(redeem(this, { session: { agent, connection } }))
  }
}
