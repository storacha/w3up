import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Shard } from '@web3-storage/capabilities'

/**
 * @param {API.ShardServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Shard.get, (input) => get(input, context))

/**
 * @param {API.Input<Shard.get>} input
 * @param {API.ShardServiceContext} context
 * @returns {Promise<API.ShardGetResult>}
 */
const get = async ({ capability }, context) => {
  /**
   * Ensure that resource is the service DID, which implies it's either
   * invoked by service itself or an authorized delegate (like admin).
   * In other words no user will be able to invoke this unless service
   * explicitly delegated capability to them to do so.
   */
  if (capability.with !== context.signer.did()) {
    return { error: new UnknownProvider(capability.with) }
  }

  return {
    ok: await context.storeTable.getCID(capability.nb.cid),
  }
}

class UnknownProvider extends Provider.Failure {
  /**
   * @param {API.DID} did
   */
  constructor(did) {
    super()
    this.did = did
    this.name = /** @type {const} */ ('UnknownProvider')
  }

  describe() {
    return `Provider ${this.did} not found`
  }
}
