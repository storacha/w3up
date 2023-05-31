import * as Types from '../src/types.js'

/**
 * @implements {Types.DelegationsStorage}
 */
export class DelegationsStorage {
  constructor() {
    /**
     * @type {Array<Types.Delegation<Types.Tuple<any>>>}
     */
    this.delegations = []
  }

  /**
   *
   * @param {Types.Link} _
   * @param  {Array<Types.Delegation<Types.Tuple<any>>>} delegations
   * @returns
   */
  async putMany(_, delegations) {
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
      if (query.audience === delegation.audience.did()) {
        delegations.push(delegation)
      }
    }
    return {
      ok: delegations
    }
  }
}
