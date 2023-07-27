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
   * @param {string[]} ids
   */
  async remove(ids) {
    for (const id of ids) {
      delete this.rateLimits[id]
    }
    return { ok: {} }
  }

  /**
   *
   * @param {string[]} subjects
   */
  async areAnyBlocked(subjects) {
    return {
      ok: Object.values(this.rateLimits).some(
        ({ subject, rate }) =>
          subject && subjects.includes(subject) && rate === 0
      ),
    }
  }
}
