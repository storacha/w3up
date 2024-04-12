import * as API from '../../src/types.js'

import { RecordNotFound } from '../../src/errors.js'

/**
 * @typedef {import('@web3-storage/capabilities/types').StorageGetError} StorageGetError
 * @typedef {import('@web3-storage/capabilities/types').StoragePutError} StoragePutError
 * @typedef {import('@ucanto/interface').UnknownLink} UnknownLink
 * @typedef {import('@ucanto/interface').Invocation} Invocation
 */

/**
 * @implements {API.TasksStorage}
 */
export class TasksStorage {
  constructor() {
    /** @type {Map<string, Invocation>} */
    this.items = new Map()
  }

  /**
   * @param {Invocation} record
   * @returns {Promise<import('@ucanto/interface').Result<{}, StoragePutError>>}
   */
  async put(record) {
    this.items.set(record.cid.toString(), record)

    // TODO: store implementation
    // const archiveDelegationRes = await task.archive()
    // if (archiveDelegationRes.error) {
    //   return {
    //     error: archiveDelegationRes.error
    //   }
    // }

    return Promise.resolve({
      ok: {},
    })
  }

  /**
   * @param {UnknownLink} link
   * @returns {Promise<import('@ucanto/interface').Result<Invocation, StorageGetError>>}
   */
  async get(link) {
    const record = this.items.get(link.toString())
    if (!record) {
      return {
        error: new RecordNotFound(),
      }
    }
    return {
      ok: record,
    }
  }

  /**
   * @param {UnknownLink} link
   * @returns {Promise<import('@ucanto/interface').Result<boolean, StorageGetError>>}
   */
  async has(link) {
    const record = this.items.get(link.toString())
    if (!record) {
      return {
        ok: false,
      }
    }
    return {
      ok: Boolean(record),
    }
  }
}
