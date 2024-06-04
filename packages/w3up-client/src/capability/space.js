import { Base } from '../base.js'

/**
 * Client for interacting with the `space/*` capabilities.
 */
export class SpaceClient extends Base {
  /**
   * Get information about a space.
   *
   * Required delegated capabilities:
   * - `space/info`
   *
   * @param {import('../types.js').DID} space - DID of the space to retrieve info about.
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async info(space, options) {
    return await this._agent.getSpaceInfo(space, options)
  }
}
