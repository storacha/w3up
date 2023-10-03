import * as Types from '../../src/types.js'

/**
 * @implements {Types.DelegationsStorage}
 */
export class DelegationsStorage {
  constructor() {
    /**
     * @type {Array<Types.Delegation<Types.Tuple<any>>>}
     */
    this.delegations = []

    /**
     * @type {Set<string>}
     */
    this.revocations = new Set()
  }

  /**
   * @param  {Array<Types.Delegation<Types.Tuple<any>>>} delegations
   */
  async putMany(delegations) {
    this.delegations = [...delegations, ...this.delegations]
    return { ok: {} }
  }

  async count() {
    return BigInt(this.delegations.length)
  }

  /**
   * @param {Types.DelegationsStorageQuery} query
   */
  async find(query) {
    const delegations = []
    for (const delegation of this.delegations) {
      if ((query.audience === delegation.audience.did()) && !this.revocations.has(delegation.cid.toString())) {
        delegations.push(delegation)
      }
    }
    return {
      ok: delegations,
    }
  }

  /**
   * 
   * @param {Types.Link[]} invocationCids 
   * @returns 
   */
  async areAnyRevoked(invocationCids) {
    return { ok: invocationCids.some(i => this.revocations.has(i.toString())) }
  }

  /**
   * 
   * @param {Types.Revocation} revocation 
   * @returns 
   */
  async revoke(revocation) {
    this.revocations.add(revocation.revoke.toString())
    return { ok: {} }
  }
}
