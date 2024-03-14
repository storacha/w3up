import * as API from './types.js'
import * as Agent from './agent.js'
import * as Task from './task.js'
import * as Coupon from './coupon/coupon.js'

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Session<Protocol>} session
 * @returns {API.CouponAPI<Protocol>}
 */
export const view = (session) => new CouponAPI(session)

/**
 * Redeems coupon from the the the archive. Throws an error if the coupon
 * password is invalid or if provided archive is not a valid.
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Session<Protocol>} session

 * @param {object} options
 * @param {Uint8Array} options.archive
 * @param {string} [options.secret]
 * @returns {Task.Task<API.CouponSession<Protocol>, Error>}
 */
export function* redeem(session, { archive, secret = '' }) {
  const coupon = yield* Coupon.open(archive, { secret })
  return yield* Coupon.redeem(coupon, { session })
}

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Session<Protocol>} session
 * @param {Coupon.Access} access
 * @returns {Task.Task<API.CouponSession<Protocol>, Error>}
 */
export function* issue({ agent, connection }, access) {
  const coupon = yield* Coupon.issue(agent, access)
  return coupon.connect(connection)
}

/**
 * @param {{agent: API.Agent}} session
 * @param {API.Coupon} coupon
 * @returns {Task.Task<API.Unit, API.DatabaseTransactionError|API.DataStoreSaveError>}
 */
export function* remove({ agent }, coupon) {
  yield* Agent.DB.transact(
    agent.db,
    coupon.proofs.map((proof) => Agent.DB.retract({ proof }))
  )

  return {}
}

/**
 * @param {{agent: API.Agent}} session
 * @param {API.Coupon} coupon
 * @returns {Task.Task<API.Unit, API.DatabaseTransactionError|API.DataStoreSaveError|Task.AbortError|RangeError>}
 */
export function* add({ agent }, coupon) {
  if (coupon.signer.did() === agent.signer.did()) {
    yield* Agent.DB.transact(
      agent.db,
      coupon.proofs.map((proof) => Agent.DB.assert({ proof }))
    )

    return {}
  } else {
    return yield* Task.fail(
      new RangeError(
        `Coupon audience is ${coupon.signer.did()} not ${agent.signer.did()}`
      )
    )
  }
}

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
   * @param {Uint8Array} archive
   * @param {object} [options]
   * @param {string} [options.secret]
   * @returns {Task.Invocation<API.CouponSession<Protocol>, Error>}
   */
  redeem(archive, options = {}) {
    return Task.perform(redeem(this.session, { archive, ...options }))
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
   * @returns {Task.Invocation<API.CouponSession<Protocol>, Error>}
   */
  issue(access) {
    return Task.perform(issue(this.session, access))
  }

  /**
   * @param {API.Coupon} coupon
   */
  add(coupon) {
    return Task.perform(add(this.session, coupon))
  }
  /**
   * @param {API.Coupon} coupon
   */
  remove(coupon) {
    return Task.perform(remove(this.session, coupon))
  }
}
