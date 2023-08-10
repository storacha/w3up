import * as Types from '../src/types.js'

/**
 * @implements {Types.RateLimitsStorage}
 */
export class RateLimitsStorage {
  constructor() {
    /**
     * @type {Record<string, { id: string, subject: string, rate: number}>}}
     */
    this.rateLimits = {}
    this.nextID = 0
  }

  /**
   *
   * @param {string} subject
   * @param {number} rate
   * @returns
   */
  async add(subject, rate) {
    const id = this.nextID.toString()
    this.nextID += 1
    this.rateLimits[id] = {
      id,
      subject,
      rate,
    }
    return { ok: { id } }
  }

  /**
   *
   * @param {string} subject
   * @returns
   */
  async list(subject) {
    return {
      ok:
        Object.values(this.rateLimits).filter((rl) => rl.subject === subject) ||
        [],
    }
  }

  /**
   *
   * @param {string} id
   */
  async remove(id) {
    delete this.rateLimits[id]
    return { ok: {} }
  }
}
