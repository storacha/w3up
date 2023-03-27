import { Delegation as CoreDelegation } from '@ucanto/core/delegation'

/**
 * @template {import('./types').Capabilities} C
 * @extends {CoreDelegation<C>}
 */
export class Delegation extends CoreDelegation {
  /** @type {Record<string, any>} */
  #meta

  /**
   * @param {import('./types').UCANBlock<C>} root
   * @param {Map<string, import('./types').Block>} [blocks]
   * @param {Record<string, any>} [meta]
   */
  constructor (root, blocks, meta = {}) {
    super(root, blocks)
    this.#meta = meta
  }

  /**
   * User defined delegation metadata.
   */
  meta () {
    return this.#meta
  }
}
