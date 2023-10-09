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
    const revoked = new Set(delegationCids.map((c) => c.toString()))
    return {
      ok: this.revocations.filter((r) => revoked.has(r.revoke.toString())),
    }
  }

  /**
   *
   * @param {Types.Revocation} revocation
   */
  async add(revocation) {
    this.revocations = [...this.revocations, revocation]
    return { ok: {} }
  }
  /**
   * @param {Types.Revocation} revocation
   */
  async reset(revocation) {
    this.revocations = [
      ...this.revocations.filter(
        (r) => r.revoke.toString() !== revocation.revoke.toString()
      ),
      revocation,
    ]

    return { ok: {} }
  }
}
