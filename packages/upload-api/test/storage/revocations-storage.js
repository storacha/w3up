import * as Types from '../../src/types.js'

/**
 * @implements {Types.RevocationsStorage}
 */
export class RevocationsStorage {
  constructor() {
    /**
     * @type {Array<Types.Delegation>}
     */
    this.delegations = []

    /**
     * @type {Array<Types.Revocation>}
     */
    this.revocations = []
  }

  /**
   *
   * @param {Types.RevocationQuery} ucans
   */
  async query(ucans) {
    const { revocations } = this
    /** @type {Types.MatchingRevocations} */
    const matches = {}
    for (const { revoke, scope, ...output } of revocations) {
      const key = /** @type {Types.ToString<Types.UCANLink>} */ (`${revoke}`)

      if (ucans[key]) {
        const match = matches[key] || {}
        match[scope] = output
        matches[key] = match
      }
    }

    return { ok: matches }
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
