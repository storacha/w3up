import * as API from '../../types.js'
import * as Provider from '@ucanto/server'
import { Admin } from '@storacha/capabilities'

/**
 * @param {API.AdminServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Admin.upload.inspect, (input) => inspect(input, context))

/**
 * @param {API.Input<typeof Admin.upload.inspect>} input
 * @param {API.AdminServiceContext} context
 * @returns {Promise<API.AdminUploadInspectResult>}
 */
const inspect = async ({ capability }, context) => {
  /**
   * Ensure that resource is the service DID, which implies it's either
   * invoked by service itself or an authorized delegate (like admin).
   * In other words no user will be able to invoke this unless service
   * explicitly delegated capability to them to do so.
   */
  if (capability.with !== context.signer.did()) {
    return { error: new UnknownProvider(capability.with) }
  }

  return await context.uploadTable.inspect(capability.nb.root)
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
