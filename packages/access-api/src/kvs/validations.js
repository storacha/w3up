import * as UCAN from '@ipld/dag-ucan'

/**
 * Validations
 */
export class Validations {
  /**
   *
   * @param {KVNamespace} kv
   */
  constructor(kv = VALIDATIONS) {
    this.kv = kv
  }

  /**
   *
   * @param {string} delegation
   */
  async create(delegation) {
    // @ts-ignore
    const ucan = UCAN.parse(delegation)
    await this.kv.put(ucan.audience.did(), delegation, {
      expirationTtl: 2 * 60,
    })

    return ucan
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
