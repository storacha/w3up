export class Space {
  /** @type {import('./types').DID} */
  #did
  /** @type {Record<string, any>} */
  #meta

  /**
   * @param {import('./types').DID} did
   * @param {Record<string, any>} meta
   */
  constructor (did, meta = {}) {
    this.#did = did
    this.#meta = meta
  }

  /**
   * The given space name.
   */
  name () {
    return this.#meta.name
  }

  /**
   * The DID of the space.
   */
  did () {
    return this.#did
  }

  /**
   * Whether the space has been registered with the service.
   */
  registered () {
    return Boolean(this.#meta.isRegistered)
  }

  /**
   * User defined space metadata.
   */
  meta () {
    return this.#meta
  }
}
