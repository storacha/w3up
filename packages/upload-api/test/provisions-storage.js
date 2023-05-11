import * as Types from '../src/types.js'

/**
 * @implements {Types.ProvisionsStorage}
 */
export class ProvisionsStorage {
  get services(){
    return []
  }

  async hasStorageProvider() {
    return { ok: true }
  }

  async put() {
    return { ok: {} }
  }

  async count() {
    return BigInt(0)
  }

  async *[Symbol.asyncIterator]() {
  }

  async *find() {
  }
}