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
    this.offers.set(
      offerToQueue.commitmentProof.toString(),
      offerToQueue.offers
    )
  }

  /**
   * @param {import('@ucanto/interface').Link<unknown, number, number, 0 | 1>} commitmentProof
   * @returns {Promise<string>}
   */
  async get(commitmentProof) {
    return Promise.resolve(`todo:${commitmentProof.toString()}`)
  }
}
