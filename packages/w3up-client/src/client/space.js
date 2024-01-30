import { Client } from './client.js'
import * as API from '../types.js'
import * as Space from '../capability/space.js'

/**
 * Client for interacting with the `space/*` capabilities.
 *
 * @extends {Client<API.AccessService>}
 */
export class SpaceClient extends Client {
  /**
   * Get information about a space.
   *
   * @param {API.SpaceDID} [space] - DID of the space to retrieve info about.
   */
  async info(space = this.agent.data.currentSpace) {
    if (!space) {
      throw new Error('No space selected, you need pass a resource.')
    }

    return await Space.info(this.agent, space)
  }
}
