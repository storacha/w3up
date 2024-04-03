import * as API from '../../src/types.js'

import { RecordNotFound } from '../../src/errors.js'

/**
 * @typedef {import('../../src/types/storage.js').StorageGetError} StorageGetError
 * @typedef {import('../../src/types/storage.js').StoragePutError} StoragePutError
 * @typedef {import('@ucanto/interface').UnknownLink} UnknownLink
 * @typedef {import('@ucanto/interface').Receipt} Receipt
 */

/**
 * @implements {API.ReceiptsStorage}
 */
export class ReceiptsStorage {
  constructor() {
    /** @type {Map<UnknownLink, Receipt>} */
    this.items = new Map()
  }

  /**
   * @param {Receipt} record
   * @returns {Promise<import('@ucanto/interface').Result<{}, StoragePutError>>}
   */
  async put(record) {
    this.items.set(record.ran.link(), record)

    return Promise.resolve({
      ok: {},
    })
  }

  /**
   * @param {UnknownLink} link
   * @returns {Promise<import('@ucanto/interface').Result<Receipt, StorageGetError>>}
   */
  async get(link) {
    const record = this.items.get(link)
    if (!record) {
      return {
        error: new RecordNotFound('not found'),
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
    const record = this.items.get(link)
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
