import * as API from './types.js'
import { sha256, delegate, Delegation } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import * as Result from './result.js'
import { GrantedAccess } from './capability/access.js'
import { Client } from './client/client.js'

/**
 * @extends {Client}
 */
export class CouponAPI extends Client {
  /**
   * Redeems coupon from the the the archive. Throws an error if the coupon
   * password is invalid or if provided archive is not a valid.
   *
   * @param {Uint8Array} archive
   * @param {object} [options]
   * @param {string} [options.password]
   */
  async redeem(archive, options = {}) {
    const { agent } = this
    const coupon = Result.unwrap(await extract(archive))
    return Result.unwrap(await redeem(coupon, { ...options, agent }))
  }

  /**
   * Issues a coupon for the given delegation.
   *
   * @param {Omit<CouponOptions, 'issuer'>} options
   */
  async issue({ proofs = [], ...options }) {
    const { agent } = this
    return await issue({
      ...options,
      issuer: agent.issuer,
      proofs: [...proofs, ...agent.proofs(options.capabilities)],
    })
  }
}

/**
 * Extracts coupon from the archive.
 *
 * @param {Uint8Array} archive
 * @returns {Promise<API.Result<Coupon, Error>>}
 */
export const extract = async (archive) => {
  const { ok, error } = await Delegation.extract(archive)
  return ok ? Result.ok(new Coupon({ proofs: [ok] })) : Result.error(error)
}

/**
 * Encodes coupon into an archive.
 *
 * @param {Model} coupon
 */
export const archive = async (coupon) => {
  const [delegation] = coupon.proofs
  return await Delegation.archive(delegation)
}

/**
 * Issues a coupon for the given delegation.
 *
 * @typedef {Omit<API.DelegationOptions<API.Capabilities>, 'audience'> & { password?: string }} CouponOptions
 * @param {CouponOptions} options
 */
export const issue = async ({ password = '', ...options }) => {
  const audience = await deriveSigner(password)
  const delegation = await delegate({
    ...options,
    audience,
  })

  return new Coupon({ proofs: [delegation] })
}

/**
 * @typedef {object} Model
 * @property {[API.Delegation]} proofs
 */

/**
 * Redeems granted access with the given agent from the given coupon.
 *
 * @param {Model} coupon
 * @param {object} options
 * @param {API.Agent<API.AccessService>} options.agent
 * @param {string} [options.password]
 * @returns {Promise<API.Result<GrantedAccess, Error>>}
 */
export const redeem = async (coupon, { agent, password = '' }) => {
  const audience = await deriveSigner(password)
  const [delegation] = coupon.proofs

  if (delegation.audience.did() !== audience.did()) {
    return Result.error(
      new RangeError(
        password === ''
          ? 'Extracting account requires a password'
          : 'Provided password is invalid'
      )
    )
  } else {
    const authorization = await delegate({
      issuer: audience,
      audience: agent,
      capabilities: delegation.capabilities,
      expiration: delegation.expiration,
      notBefore: delegation.notBefore,
      proofs: [delegation],
    })

    return Result.ok(new GrantedAccess({ agent, proofs: [authorization] }))
  }
}

/**
 * @param {string} password
 */
const deriveSigner = async (password) => {
  const { digest } = await sha256.digest(new TextEncoder().encode(password))
  return await ed25519.Signer.derive(digest)
}

export class Coupon {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
  }

  get proofs() {
    return this.model.proofs
  }

  /**
   *
   * @param {API.Agent<API.AccessService>} agent
   * @param {object} [options]
   * @param {string} [options.password]
   */
  redeem(agent, options = {}) {
    return redeem(this, { ...options, agent })
  }

  archive() {
    return archive(this)
  }
}
