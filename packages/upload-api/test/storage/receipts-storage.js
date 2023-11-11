import * as Types from '../../src/types.js'

/**
 * @implements {Types.ReceiptsStorage}
 */
export class ReceiptsStorage {
  constructor() {
    /**
     * @type {Record<string, Types.Receipt>}
     */
    this.receipts = {}
  }
  /**
   * @param {Types.UnknownLink} task
   */
  async get(task) {
    const receipt = this.receipts[task.toString()]
    if (receipt) {
      return { ok: this.receipts[task.toString()] }
    } else {
      return {
        error: {
          name: /** @type {const} */ ('ReceiptNotFound'),
          message: `could not find a task for ${task}`,
        },
      }
    }
  }

  /**
   * @param {Types.Receipt} receipt
   */
  async put(receipt) {
    this.receipts[receipt.ran.link().toString()] = receipt

    return {
      ok: {},
    }
  }
}
