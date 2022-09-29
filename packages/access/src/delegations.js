import { delegate } from '@ucanto/core'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'

/**
 * TODO: clear expired delegations
 */
export class Delegations {
  /**
   * @param {{
   * principal: Ucanto.Signer;
   * received?: Ucanto.Delegation[]
   * created?: Ucanto.Delegation[]
   * meta?: import('./awake/types').MetaMap
   * }} opts
   */
  constructor(opts) {
    this.principal = opts.principal

    /** @type {Ucanto.Delegation[]} */
    this.received = opts.received || []

    /** @type {Ucanto.Delegation[]} */
    this.created = opts.created || []

    /** @type {import('./awake/types').MetaMap} */
    this.meta = new Map()
  }

  /**
   *
   * @param {Ucanto.Delegation} delegation
   */
  async add(delegation) {
    this.received.push(delegation)
  }

  /**
   *
   * @param {Ucanto.Delegation[]} delegations
   */
  async addMany(delegations) {
    for (const d of delegations) {
      this.received.push(d)
    }
  }

  async full() {
    const delegation = await delegate({
      // @ts-ignore
      issuer: this.principal,
      audience: this.principal,
      capabilities: [
        {
          can: 'identify/*',
          with: this.principal.did(),
        },
      ],
      lifetimeInSeconds: 8_600_000,
    })

    this.received.push(delegation)
    return this
  }

  /**
   *
   * @param {import('@ucanto/interface').Principal} audience
   * @param {import('@ipld/dag-ucan').Capabilities} capabilities
   * @param {number} [lifetimeInSeconds]
   */
  async delegate(audience, capabilities, lifetimeInSeconds) {
    const delegation = await delegate({
      issuer: this.principal,
      // @ts-ignore
      audience,
      capabilities,
      lifetimeInSeconds,
      proofs: this.received,
    })

    this.created.push(delegation)
    return delegation
  }
}
