import { Agent } from '@storacha/access/agent'
import { serviceConf, receiptsEndpoint } from './service.js'

export class Base {
  /**
   * @type {Agent}
   * @protected
   */
  _agent

  /**
   * @type {import('./types.js').ServiceConf}
   * @protected
   */
  _serviceConf

  /**
   * @param {import('@storacha/access').AgentData} agentData
   * @param {object} [options]
   * @param {import('./types.js').ServiceConf} [options.serviceConf]
   * @param {URL} [options.receiptsEndpoint]
   */
  constructor(agentData, options = {}) {
    this._serviceConf = options.serviceConf ?? serviceConf
    this._agent = new Agent(agentData, {
      servicePrincipal: this._serviceConf.access.id,
      // @ts-expect-error I know but it will be HTTP for the forseeable.
      url: this._serviceConf.access.channel.url,
      connection: this._serviceConf.access,
    })
    this._receiptsEndpoint = options.receiptsEndpoint ?? receiptsEndpoint
  }

  /**
   * The current user agent (this device).
   *
   * @type {Agent}
   */
  get agent() {
    return this._agent
  }

  /**
   * @protected
   * @param {import('./types.js').Ability[]} abilities
   */
  async _invocationConfig(abilities) {
    const resource = this._agent.currentSpace()
    if (!resource) {
      throw new Error(
        'missing current space: use createSpace() or setCurrentSpace()'
      )
    }
    const issuer = this._agent.issuer
    const proofs = await this._agent.proofs(
      abilities.map((can) => ({ can, with: resource }))
    )
    const audience = this._serviceConf.upload.id
    return { issuer, with: resource, proofs, audience }
  }
}
