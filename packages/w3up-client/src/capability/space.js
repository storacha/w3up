import { Base } from '../base.js'

/**
 * Client for interacting with the `space/*` capabilities.
 */
export class SpaceClient extends Base {
  /**
   * Get information about a space.
   *
   * @param {import('../types.js').DID} space - DID of the space to retrieve info about.
   */
  async info(space) {
    return await this._agent.getSpaceInfo(space)
  }
}
