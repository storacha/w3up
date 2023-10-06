import * as Types from '../../src/types.js'

/**
 * @implements {Types.RevocationsStorage}
 */
export class RevocationsStorage {
  constructor() {
    /**
     * @type {Array<Types.Delegation<Types.Tuple<any>>>}
     */
    this.delegations = []

    /**
     * @type {Array<Types.Revocation>}
     */
    this.revocations = []
  }

  /**
   * 
   * @param {Types.Link[]} delegationCids 
   * @returns 
   */
  async getAll(delegationCids) {
    const revoked = new Set(delegationCids.map(c => c.toString()))
    return { ok: this.revocations.filter(r => revoked.has(r.revoke.toString())) }
  }

  /**
   * 
   * @param {Types.Revocation[]} revocations
   * @returns 
   */
  async addAll(revocations) {
    this.revocations = this.revocations.concat(revocations)
    return { ok: {} }
  }
}
