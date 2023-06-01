/**
 * @typedef {import('@web3-storage/aggregate-client/types').Offer[]} Offers
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
    this.offers.set(offerToQueue.commitmentProof, offerToQueue.offers)
  }

  /**
   * @param {string} commitmentProof
   * @returns {Promise<string>}
   */
  async get(commitmentProof) {
    return Promise.resolve(`todo:${commitmentProof}`)
  }
}
