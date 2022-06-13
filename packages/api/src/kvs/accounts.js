import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * @typedef {{account: string, proof: string}} AccountValue
 */

/**
 * Accounts
 */
export class Accounts {
  /**
   *
   * @param {KVNamespace} kv
   */
  constructor(kv = ACCOUNTS) {
    this.kv = kv
  }

  /**
   *
   * @param {string} issuerDID
   * @param {string} resourceDID
   * @param {string} proof
   */
  async register(issuerDID, resourceDID, proof) {
    const bytes = raw.encode(new TextEncoder().encode(proof))
    const account = CID.create(
      1,
      raw.code,
      await sha256.digest(bytes)
    ).toString()
    await this.kv.put(issuerDID, JSON.stringify({ account, proof }))
    await this.kv.put(resourceDID, JSON.stringify({ account, proof }))
  }

  /**
   * @param {string} did
   */
  async get(did) {
    const value = /** @type {AccountValue} */ (
      await this.kv.get(did, {
        type: 'json',
      })
    )

    if (value) {
      return value
    }
  }
}
