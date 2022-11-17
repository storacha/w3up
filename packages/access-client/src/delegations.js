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

    /**
     * @type {Map<string, {cid: string, cap: Ucanto.Capability}[]>}
     */
    this.receivedByResource = new Map()
    /**
     * @type {Map<string, Ucanto.Delegation>}
     */
    this.receivedMap = new Map()
  }

  /**
   *
   * @param {Ucanto.Delegation} delegation
   */
  async add(delegation) {
    const cid = delegation.cid.toString()

    for (const cap of delegation.capabilities) {
      const byResource = this.receivedByResource.get(cap.with) ?? []

      byResource.push({ cid: delegation.cid.toString(), cap })
      this.receivedByResource.set(cap.with, byResource)
    }
    this.received.push(delegation)

    this.receivedMap.set(cid, delegation)
  }

  /**
   * @param {string} resource
   */
  getByResource(resource) {
    const byResource = this.receivedByResource.get(resource)
    if (!byResource) {
      return
    }

    return byResource.map((r) => {
      return this.receivedMap.get(r.cid)
    })
  }

  /**
   * Add multiple received delegations
   *
   * @param {Ucanto.Delegation[]} delegations
   */
  async addMany(delegations) {
    for (const d of delegations) {
      this.add(d)
    }
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
      // be smarter about picking only the needs delegations
      proofs: [...this.receivedMap.values()],
    })

    this.created.push(delegation)
    return delegation
  }
}
