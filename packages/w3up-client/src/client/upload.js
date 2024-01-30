import { Upload } from '@web3-storage/upload-client'
import {
  Upload as UploadCapabilities,
  Store as StoreCapabilities,
} from '@web3-storage/capabilities'
import { Client } from './client.js'
import * as API from '../types.js'
import {
  uploadFile,
  uploadDirectory,
  uploadCAR,
} from '@web3-storage/upload-client'

/**
 * Client for interacting with the `upload/*` capabilities.
 *
 * @extends {Client<API.UploadService>}
 */
export class UploadClient extends Client {
  /**
   * Register an "upload" to the resource.
   *
   * @param {API.UnknownLink} root - Root data CID for the DAG that was stored.
   * @param {API.CARLink[]} shards - CIDs of CAR files that contain the DAG.
   * @param {API.RequestOptions} [options]
   */
  async add(root, shards, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.add.can])
    return Upload.add(conf, root, shards, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * Get details of an "upload".
   *
   * @param {import('../types.js').UnknownLink} root - Root data CID for the DAG that was stored.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async get(root, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.add.can])
    return Upload.get(conf, root, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * List uploads registered to the resource.
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.list.can])
    return Upload.list(conf, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * Remove an upload by root data CID.
   *
   * @param {import('../types.js').UnknownLink} root - Root data CID to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(root, options = {}) {
    const conf = await this._invocationConfig([UploadCapabilities.remove.can])
    return Upload.remove(conf, root, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * Uploads a file to the service and returns the root data CID for the
   * generated DAG.
   *
   * @param {API.BlobLike} file - File data.
   * @param {API.UploadOptions} [options]
   */
  async uploadFile(file, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])

    return uploadFile(conf, file, options)
  }

  /**
   * Uploads a directory of files to the service and returns the root data CID
   * for the generated DAG. All files are added to a container directory, with
   * paths in file names preserved.
   *
   * @param {API.FileLike[]} files - File data.
   * @param {API.UploadDirectoryOptions} [options]
   */
  async uploadDirectory(files, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])

    return uploadDirectory(conf, files, options)
  }

  /**
   * Uploads a CAR file to the service.
   *
   * The difference between this function and `capability.store.add` is that the
   * CAR file is automatically sharded and an "upload" is registered, linking
   * the individual shards (see `capability.upload.add`).
   *
   * Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.
   *
   * @param {API.BlobLike} car - CAR file.
   * @param {API.UploadOptions} [options]
   */
  async uploadCAR(car, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])

    return uploadCAR(conf, car, options)
  }
}
