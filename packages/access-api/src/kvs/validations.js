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
   * @param {string} ucan
   */
  async put(ucan) {
    const delegation =
      /** @type {import('@ucanto/interface').Delegation<[import('@web3-storage/access/capabilities/types').VoucherClaim]>} */ (
        await stringToDelegation(ucan)
      )

    await this.kv.put(delegation.audience.did(), ucan, {
      expiration: delegation.expiration,
    })

    return delegation
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
