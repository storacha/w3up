import { Index } from '@web3-storage/upload-client'
import { Index as IndexCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `index/*` capabilities.
 */
export class IndexClient extends Base {
  /**
   * Register an "index" to the resource.
   * 
   * Required delegated capabilities:
   * - `space/index/add`
   *
   * @param {import('../types.js').CARLink} index - CID of the CAR file that contains the index data.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(index, options = {}) {
    const conf = await this._invocationConfig([IndexCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Index.add(conf, index, options)
  }
}
