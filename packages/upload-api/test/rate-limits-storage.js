import * as Types from '../src/types.js'

/**
 * @implements {Types.RateLimitsStorage}
 */
export class RateLimitsStorage {
  constructor() {
    /**
     * @type {Record<string, Types.RateLimit>}}
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
      rate
    }
    return { ok: {} }
  }

  /**
   * 
   * @param {string} subject 
   * @returns 
   */
  async list(subject) {
    return { ok: Object.values(this.rateLimits).filter((rl) => rl.subject === subject) || [] }
  }

  /**
   * 
   * @param {string} id 
   */
  async remove(id) {
    delete this.rateLimits[id]
    return { ok: {} }
  }

  /**
   * 
   * @param {string[]} subjects 
   */
  async areAnyBlocked(subjects) {
    return { ok: Object.values(this.rateLimits).some(({subject, rate}) => (subject && subjects.includes(subject)) && (rate === 0))}
  }


}
