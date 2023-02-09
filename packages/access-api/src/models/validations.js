import { stringToDelegation } from '@web3-storage/access/encoding'

/**
 * Validations
 */
export class Validations {
  /**
   *
   * @param {KVNamespace} kv
   */
  constructor(kv) {
    this.kv = kv
  }

  /**
   * @template {import('@ucanto/interface').Capabilities} [T=import('@ucanto/interface').Capabilities]
   * @param {import('@web3-storage/access/src/types').EncodedDelegation<T>} ucan
   */
  async put(ucan) {
    const delegation =
      /** @type {import('@ucanto/interface').Delegation<T>} */ (
        stringToDelegation(ucan)
      )

    await this.kv.put(delegation.audience.did(), ucan, {
      expiration: delegation.expiration,
    })

    return delegation
  }

  /**
   * @template {import('@ucanto/interface').Capabilities} T = import('@ucanto/interface').Capabilities
   * @param {import('@web3-storage/access/src/types').EncodedDelegation<T>} ucan
   * @param {import('@ucanto/interface').DID} agent
   * @param {number} expirationTtl - Expiration in second from now. Defaults to 5 mins.
   */
  async putSession(ucan, agent, expirationTtl = 60 * 5) {
    return await this.kv.put(agent, ucan, {
      expirationTtl,
    })
  }

  /**
   * @param {string} did
   */
  async get(did) {
    const val = await this.kv.get(did)
    if (!val) {
      throw new Error('Validation not found')
    }

    return val
  }

  /**
   * @param {string} did
   */
  async delete(did) {
    await this.kv.delete(did)
  }
}
