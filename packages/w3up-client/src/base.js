import { Agent } from '@web3-storage/access/agent'
import { serviceConf } from './service.js'

export class Base {
  /**
   * @type {Agent}
   * @protected
   */
  _agent

  /**
   * @type {import('./types').ServiceConf}
   * @protected
   */
  _serviceConf

  /**
   * @param {import('@web3-storage/access').AgentData} agentData
   * @param {object} [options]
   * @param {import('./types').ServiceConf} [options.serviceConf]
   */
  constructor (agentData, options = {}) {
    this._serviceConf = options.serviceConf ?? serviceConf
    this._agent = new Agent(agentData, {
      servicePrincipal: this._serviceConf.access.id,
      // @ts-expect-error I know but it will be HTTP for the forseeable.
      url: this._serviceConf.access.channel.url,
      connection: this._serviceConf.access
    })
  }

  /**
   * @protected
   * @param {import('./types').Ability[]} abilities
   */
  async _invocationConfig (abilities) {
    const resource = this._agent.currentSpace()
    if (!resource) {
      throw new Error('missing current space: use createSpace() or setCurrentSpace()')
    }
    const issuer = this._agent.issuer
    const proofs = await this._agent.proofs(abilities.map(can => ({ can, with: resource })))
    const audience = this._serviceConf.upload.id
    return { issuer, with: resource, proofs, audience }
  }
}
