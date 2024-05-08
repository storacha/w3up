import { Blob } from '@web3-storage/upload-client'
import { Blob as BlobCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `blob/*` capabilities.
 */
export class BlobClient extends Base {
  /**
   * Store a DAG encoded as a CAR file.
   *
   * @param {Blob} car - CAR file data.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(car, options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Blob.add(conf, car, options)
  }

  /**
   * List CAR files stored to the resource.
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.list.can])
    options.connection = this._serviceConf.upload
    return Blob.list(conf, options)
  }

  /**
   * Remove a stored CAR file by CAR CID.
   *
   * @param {import('../types.js').CARLink} link - CID of CAR file to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(link, options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.remove.can])
    options.connection = this._serviceConf.upload
    return Blob.remove(conf, link, options)
  }
}
