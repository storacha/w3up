export class DudewhereBucket {
  constructor() {
    /**
     * @type {{dataCid:string, carCid:string}[]}
     */
    this.items = []
  }
  /**
   * @param {string} dataCid
   * @param {string} carCid
   */
  async put(dataCid, carCid) {
    this.items.push({ dataCid, carCid })
  }
}
