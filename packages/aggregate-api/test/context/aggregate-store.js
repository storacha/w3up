import * as API from '../../src/types.js'

/**
 * @implements {API.AggregateStore}
 */
export class AggregateStore {
  constructor() {
    /** @type {Map<string, unknown[]>} */
    this.items = new Map()
  }

  /**
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} commitmentProof
   * @param {unknown} deal
   */
  put(commitmentProof, deal) {
    const dealEntries = this.items.get(commitmentProof.toString())
    let newEntries
    if (dealEntries) {
      newEntries = [...dealEntries, deal]
      this.items.set(commitmentProof.toString(), newEntries)
    } else {
      newEntries = [deal]
      this.items.set(commitmentProof.toString(), newEntries)
    }

    return Promise.resolve()
  }

  /**
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} commitmentProof
   */
  get(commitmentProof) {
    return Promise.resolve(this.items.get(commitmentProof.toString()))
  }
}
