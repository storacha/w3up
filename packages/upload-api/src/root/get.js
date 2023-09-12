import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Root } from '@web3-storage/capabilities'

/**
 * @param {API.RootServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Root.get, (input) => get(input, context))

/**
 * @param {API.Input<Root.get>} input
 * @param {API.RootServiceContext} context
 * @returns {Promise<API.RootGetResult>}
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
    ok: await context.uploadTable.getCID(
      // I shouldn't need to typecast this (and it looks alright in Visual Studio!) but
      // tsc complains that `capability.nb.cid` is of type unknown...
      /** @type {API.UnknownLink} */(capability.nb.cid)
    ),
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
