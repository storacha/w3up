/**
 * @typedef {import('@web3-storage/aggregate-client/types').Offer[]} Offers
 */

export class OfferBucket {
  constructor() {
    /**
     * @type {{ ts:number, offers:Offers}[]}
     */
    this.items = []
  }
  /**
   * @param {Offers} offers
   */
  async put(offers) {
    this.items.push({ ts: Date.now(), offers })
  }
}
