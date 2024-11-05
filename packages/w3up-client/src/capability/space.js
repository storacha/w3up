import { Base } from '../base.js'
import { Space as SpaceCapabilities } from '@web3-storage/capabilities'
import * as API from '../types.js'

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

  /**
   * Record egress data for a served resource.
   * It will execute the capability invocation to find the customer and then record the egress data for the resource.
   *
   * Required delegated capabilities:
   * - `space/content/serve/egress/record`
   *
   * @param {object} egressData
   * @param {import('../types.js').SpaceDID} egressData.space
   * @param {API.UnknownLink} egressData.resource
   * @param {number} egressData.bytes
   * @param {string} egressData.servedAt
   * @param {object} [options]
   * @param {string} [options.nonce]
   * @param {API.Delegation[]} [options.proofs]
   * @returns {Promise<API.EgressRecordSuccess>}
   */
  async recordEgress(egressData, options) {
    const out = await recordEgress(
      { agent: this.agent },
      { ...egressData },
      { ...options }
    )

    if (!out.ok) {
      throw new Error(
        `failed ${SpaceCapabilities.recordEgress.can} invocation`,
        {
          cause: out.error,
        }
      )
    }

    return /** @type {API.EgressRecordSuccess} */ (out.ok)
  }
}

/**
 * Record egress data for a resource from a given space.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} egressData
 * @param {API.SpaceDID} egressData.space
 * @param {API.UnknownLink} egressData.resource
 * @param {number} egressData.bytes
 * @param {string} egressData.servedAt
 * @param {object} options
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 */
export const recordEgress = async (
  { agent },
  { space, resource, bytes, servedAt },
  { nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(SpaceCapabilities.recordEgress, {
    with: space,
    proofs,
    nonce,
    nb: {
      resource,
      bytes,
      servedAt: Math.floor(new Date(servedAt).getTime() / 1000),
    },
  })
  return receipt.out
}
