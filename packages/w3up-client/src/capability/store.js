import { Store } from '@web3-storage/upload-client'
import { Store as StoreCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `store/*` capabilities.
 */
export class StoreClient extends Base {
  /**
   * Store a DAG encoded as a CAR file.
   *
   * @param {Blob} car CAR file data.
   * @param {import('../types').RequestOptions} [options]
   */
  async add (car, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Store.add(conf, car, options)
  }

  /**
   * List CAR files stored to the resource.
   *
   * @param {import('../types').ListRequestOptions} [options]
   */
  async list (options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Store.list(conf, options)
  }

  /**
   * Remove a stored CAR file by CAR CID.
   *
   * @param {import('../types').CARLink} link CID of CAR file to remove.
   * @param {import('../types').RequestOptions} [options]
   */
  async remove (link, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.remove.can])
    options.connection = this._serviceConf.upload
    return Store.remove(conf, link, options)
  }
}
