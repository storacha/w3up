/**
 * @typedef {import('@web3-storage/aggregate-client/types').Piece[]} Offers
 */

export class OfferStore {
  constructor() {
    /** @type {Map<string, Offers>} */
    this.offers = new Map()
  }
  /**
   * @param {import('../../src/types').OfferToQueue} offerToQueue
   */
  async queue(offerToQueue) {
    this.offers.set(offerToQueue.piece.link.toString(), offerToQueue.offers)
  }

  /**
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} pieceLink
   * @returns {Promise<string>}
   */
  async get(pieceLink) {
    return Promise.resolve(`todo:${pieceLink.toString()}`)
  }
}
