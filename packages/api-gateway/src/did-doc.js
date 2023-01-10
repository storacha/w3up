/**
 * represents a [Service Endpoint][1] where UCANs can be delivered to the DID subject.
 *
 * [1]: https://www.w3.org/TR/did-core/#dfn-service-endpoints
 */
export class UcanServiceEndpoint {
  /** @type {"https://ucan.xyz"} */
  type = 'https://ucan.xyz'
  /** @type {string} */
  id

  /**
   * @param {unknown} unknown
   * @returns {UcanServiceEndpoint|undefined}
   */
  static as = (unknown) => {
    const s = unknown
    const id =
      s &&
      typeof s === 'object' &&
      'id' in s &&
      typeof s.id === 'string' &&
      s.id
        ? new URL(s.id)
        : undefined
    const type =
      s && typeof s === 'object' && 'type' in s && typeof s.type === 'string'
        ? s.type
        : undefined
    const ucanServiceType = /** @type {const} */ ('https://ucan.xyz')
    if (!id || type !== ucanServiceType) {
      return
    }
    return {
      id: this.prototype.id,
      type: ucanServiceType,
    }
  }

  /**
   * @param {unknown[]} candidates
   * @returns {UcanServiceEndpoint|undefined}
   */
  static find(candidates) {
    for (const candidate of candidates) {
      const ucanService = this.as(candidate)
      if (ucanService) {
        return ucanService
      }
    }
  }

  /**
   * @param {object} options
   * @param {string} options.id
   */
  constructor({ id }) {
    this.id = id
  }
}
