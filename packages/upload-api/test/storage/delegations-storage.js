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
     * @type {Types.RevocationsToMeta}
     */
    this.revocations = {}
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
      if ((query.audience === delegation.audience.did())) {
        delegations.push(delegation)
      }
    }
    return {
      ok: delegations,
    }
  }

  /**
   * 
   * @param {Types.Link[]} delegationCids 
   * @returns 
   */
  async getRevocations(delegationCids) {
    const allRevocations = delegationCids.reduce((m, cid) => {
      /** @type {string} */
      const cidStr = cid.toString()
      const revocations = this.revocations[cidStr]
      if (revocations) {
        m[cidStr] = revocations
      }
      return m
    }, /** @type {Types.RevocationsToMeta} */({}))
    return { ok: allRevocations }
  }

  /**
   * 
   * @param {Types.Link} delegationCID
   * @param {Types.Link} revocationContextCID
   * @param {Types.Link} revocationInvocationCID
   * @returns 
   */
  async revoke(delegationCID, revocationContextCID, revocationInvocationCID) {
    /** @type {string} */
    const delegationCIDStr = delegationCID.toString()
    /** @type {Types.RevocationMeta[]} */
    const existingRevocationContexts = this.revocations[delegationCIDStr] || []
    this.revocations[delegationCIDStr] = [
      ...existingRevocationContexts,
      { context: revocationContextCID, cause: revocationInvocationCID }
    ]

    return { ok: {} }
  }
}
