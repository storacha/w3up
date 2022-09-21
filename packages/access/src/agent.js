import { Delegations } from './delegations.js'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as API from '@ucanto/interface'
import { Peer } from './awake/peer.js'

export class Agent {
  /**
   * @param {{
   * principal: API.SigningPrincipal;
   * delegations: Delegations
   * }} opts
   */
  constructor(opts) {
    this.principal = opts.principal
    this.delegations = opts.delegations
  }

  /**
   * @param {API.SigningPrincipal} principal
   */
  static async generate(principal) {
    const d = new Delegations({ principal })

    return new Agent({ principal, delegations: await d.full() })
  }

  did() {
    return this.principal.did()
  }

  /**
   *
   * @param {API.UCAN.DIDView} audience
   * @param {import('@ipld/dag-ucan').Capabilities} capabilities
   * @param {number} [lifetimeInSeconds]
   */
  delegate(audience, capabilities, lifetimeInSeconds) {
    return this.delegations.delegate(audience, capabilities, lifetimeInSeconds)
  }

  async export() {
    const data = {
      privateKey: this.principal,
      delegations: await this.delegations.export(),
    }

    return data
  }

  /**
   * @param { typeof import('@ucanto/principal')['SigningPrincipal']} parser
   * @param {{
   * privateKey: string;
   * created: string;
   * received: string;
   * meta: [string, import('./awake/types').PeerMeta] []
   * }} data
   */
  static async import(parser, data) {
    const principal = parser.parse(data.privateKey)
    const delegations = await Delegations.import(principal, data)

    return new Agent({ principal, delegations })
  }

  /**
   *
   * @param {import('../src/awake/types').Channel} channel
   */
  peer(channel) {
    return new Peer({ agent: this, channel })
  }
}
