import { Blob } from '@web3-storage/upload-client'
import { Blob as BlobCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `blob/*` capabilities.
 */
export class BlobClient extends Base {
  /**
   * Store a Blob to the resource.
   *
   * Required delegated capabilities:
   * - `space/blob/add`
   *
   * @param {Blob} blob - blob data.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(blob, options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return Blob.add(conf, blob, options)
  }

  /**
   * List blobs stored to the resource.
   *
   * Required delegated capabilities:
   * - `space/blob/list`
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.list.can])
    options.connection = this._serviceConf.upload
    return Blob.list(conf, options)
  }

  /**
   * Remove a stored blob by multihash digest.
   *
   * Required delegated capabilities:
   * - `space/blob/remove`
   *
   * @param {import('multiformats').MultihashDigest} digest - digest of blob to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(digest, options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.remove.can])
    options.connection = this._serviceConf.upload
    return Blob.remove(conf, digest, options)
  }

  /**
   * Gets a stored blob by multihash digest.
   *
   * @param {import('multiformats').MultihashDigest} digest - digest of blob to get.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async get(digest, options = {}) {
    const conf = await this._invocationConfig([BlobCapabilities.get.can])
    options.connection = this._serviceConf.upload
    return Blob.get(conf, digest, options)
  }
}
