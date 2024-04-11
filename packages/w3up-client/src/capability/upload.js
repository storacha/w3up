import { Upload } from '@web3-storage/upload-client'
import { Upload as UploadCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `upload/*` capabilities.
 */
export class UploadClient extends Base {
  /**
   * Register an "upload" to the resource.
   *
   * @param {import('../types.js').UnknownLink} root - Root data CID for the DAG that was stored.
   * @param {import('../types.js').CARLink[]} shards - CIDs of CAR files that contain the DAG.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(root, shards, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Upload.add(conf, root, shards, options)
  }

  /**
   * Get details of an "upload".
   *
   * @param {import('../types.js').UnknownLink} root - Root data CID for the DAG that was stored.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async get(root, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.get.can])
    options.connection = this._serviceConf.upload
    return Upload.get(conf, root, options)
  }

  /**
   * List uploads registered to the resource.
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.list.can])
    options.connection = this._serviceConf.upload
    return Upload.list(conf, options)
  }

  /**
   * Remove an upload by root data CID.
   *
   * @param {import('../types.js').UnknownLink} root - Root data CID to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(root, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.remove.can])
    options.connection = this._serviceConf.upload
    return Upload.remove(conf, root, options)
  }
}
