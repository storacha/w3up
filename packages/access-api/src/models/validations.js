import { stringToDelegation } from '@web3-storage/access/encoding'

/**
 * Validations
 */
export class Validations {
  /**
   *
   * @param {KVNamespace} kv
   * @param {DurableObjectNamespace} spaceVerifiers
   */
  constructor(kv, spaceVerifiers) {
    this.kv = kv
    this.spaceVerifiers = spaceVerifiers
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

    // TODO: remove this KV stuff once we have the durable objects stuff in production
    await this.kv.put(delegation.audience.did(), ucan, {
      expiration: delegation.expiration,
    })
    if (delegation.capabilities[0].nb?.space) {
      const durableObjectID = this.spaceVerifiers.idFromName(
        delegation.capabilities[0].nb.space
      )
      const durableObject = this.spaceVerifiers.get(durableObjectID)
      // hostname is totally ignored by the durable object but must be set so set it to example.com
      const response = await durableObject.fetch(
        'https://example.com/delegation',
        {
          method: 'PUT',
          body: ucan,
        }
      )
      if (response.status === 400) {
        throw new Error(response.statusText)
      }
    }

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
