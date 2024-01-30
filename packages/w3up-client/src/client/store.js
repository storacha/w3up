import { Store } from '@web3-storage/upload-client'
import { Store as StoreCapabilities } from '@web3-storage/capabilities'
import { Client } from './client.js'
import * as API from '../types.js'

/**
 * Client for interacting with the `store/*` capabilities.
 *
 * @extends {Client<API.UploadService>}
 */
export class StoreClient extends Client {
  /**
   * Store a DAG encoded as a CAR file.
   *
   * @param {Blob} car - CAR file data.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(car, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    return Store.add(conf, car, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * Get details of a stored item.
   *
   * @param {import('../types.js').UnknownLink} link - Root data CID for the DAG that was stored.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async get(link, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.get.can])
    return Store.get(conf, link, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * List CAR files stored to the resource.
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    return Store.list(conf, {
      connection: this.agent.connection,
      ...options,
    })
  }

  /**
   * Remove a stored CAR file by CAR CID.
   *
   * @param {import('../types.js').CARLink} link - CID of CAR file to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(link, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.remove.can])
    return Store.remove(conf, link, {
      connection: this.agent.connection,
      ...options,
    })
  }
}
