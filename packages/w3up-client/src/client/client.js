import { Agent } from '../agent.js'
import * as API from '../types.js'

/**
 * @template {Record<string, any>} [Service={}]
 */
export class Client {
  /**
   * @type {Agent<Service>}
   * @protected
   */
  _agent

  /**
   * @param {API.Agent<Service>} agent
   */
  constructor(agent) {
    this._agent = agent
  }

  /**
   * The current user agent (this device).
   *
   * @type {Agent<Service>}
   */
  get agent() {
    return this._agent
  }

  /**
   * @protected
   * @param {API.Ability[]} abilities
   */
  async _invocationConfig(abilities) {
    const resource = this.agent.data.currentSpace
    if (!resource) {
      throw new Error(
        'missing current space: use createSpace() or setCurrentSpace()'
      )
    }
    const issuer = this._agent.issuer
    const proofs = await this._agent.proofs(
      abilities.map((can) => ({ can, with: resource }))
    )

    const { connection } = this.agent
    const audience = this.agent.connection.id
    return { issuer, with: resource, proofs, audience, connection }
  }
}
