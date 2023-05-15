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
   * @param  {Array<Types.Delegation<Types.Tuple<any>>>} delegations
   * @returns
   */
  async putMany(...delegations) {
    this.delegations = [...delegations, ...this.delegations]
    return {}
  }

  async count() {
    return BigInt(this.delegations.length)
  }

  async *[Symbol.asyncIterator]() {}

  /**
   * @param {Types.DelegationsStorageQuery} query
   */
  async *find(query) {
    for (const delegation of this.delegations) {
      if (query.audience === delegation.audience.did()) {
        yield delegation
      }
    }
  }
}
