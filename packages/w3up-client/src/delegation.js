import { Delegation as CoreDelegation } from '@ucanto/core/delegation'

/* c8 ignore start */
/**
 * @template {import('./types.js').Capabilities} C
 * @extends {CoreDelegation<C>}
 */
export class Delegation extends CoreDelegation {
  /* c8 ignore stop */
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
