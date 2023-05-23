/**
 * @typedef {import('@web3-storage/aggregate-client/types').Offer[]} Offers
 */

export class OfferStore {
  constructor() {
    /** @type {Map<string, Offers>} */
    this.offers = new Map()
  }
  /**
   * @param {string} commitmentProof 
   * @param {Offers} offers
   */
  async put(commitmentProof, offers) {
    this.offers.set(commitmentProof, offers)
  }

  /**
   * @param {string} commitmentProof 
   * @returns {Promise<string>}
   */
  async get(commitmentProof) {
    return Promise.resolve(`todo:${commitmentProof}`)
  }
}
