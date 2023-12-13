import { Delegation as CoreDelegation } from '@ucanto/core/delegation'

/**
 * @template {import('./types.js').Capabilities} C
 * @extends {CoreDelegation<C>}
 */
/* c8 ignore next */
export class Delegation extends CoreDelegation {
  /** @type {Record<string, any>} */
  #meta

  /**
   * @param {import('./types.js').UCANBlock<C>} root
   * @param {Map<string, import('./types.js').Block>} [blocks]
   * @param {Record<string, any>} [meta]
   */
  constructor(root, blocks, meta = {}) {
    super(root, blocks)
    this.#meta = meta
  }

  /**
   * User defined delegation metadata.
   */
  meta() {
    return this.#meta
  }
}
