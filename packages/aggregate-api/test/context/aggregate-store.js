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
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} pieceLink
   * @param {unknown} deal
   */
  put(pieceLink, deal) {
    const dealEntries = this.items.get(pieceLink.toString())
    let newEntries
    if (dealEntries) {
      newEntries = [...dealEntries, deal]
      this.items.set(pieceLink.toString(), newEntries)
    } else {
      newEntries = [deal]
      this.items.set(pieceLink.toString(), newEntries)
    }

    return Promise.resolve()
  }

  /**
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} pieceLink
   */
  get(pieceLink) {
    return Promise.resolve(this.items.get(pieceLink.toString()))
  }
}
