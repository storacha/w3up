/**
 * Index Capabilities.
 *
 * W3 Indexing protocol allows authorized agents to submit verifiable claims
 * about content-addressed data to be published on the InterPlanetary Network
 * Indexer (IPNI), making it publicly queryable.
 *
 * These can be imported directly with:
 * ```js
 * import * as Index from '@web3-storage/capabilities/index'
 * ```
 *
 * @module
 */
import { CAR } from '@ucanto/core'
import { capability, Schema, ok } from '@ucanto/validator'
import { equalWith, SpaceDID, and, equal } from '../utils.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derive any `index/` prefixed capability for the space identified by the DID
 * in the `with` field.
 */
export const index = capability({
  can: 'index/*',
  /** DID of the space where indexed data is stored. */
  with: SpaceDID,
  derives: equalWith,
})

/**
 * `index/add` capability allows an agent to submit verifiable claims
 * about content-addressed data to be published on the InterPlanetary Network
 * Indexer (IPNI), making it publicly queryable.
 */
export const add = capability({
  can: 'index/add',
  /** DID of the space where indexed data is stored. */
  with: SpaceDID,
  nb: Schema.struct({
    /** Content Archive (CAR) containing the `Index`. */
    index: Schema.link({ code: CAR.code }),
  }),
  derives: (claimed, delegated) =>
    and(equalWith(claimed, delegated)) ||
    and(equal(claimed.nb.index, delegated.nb.index, 'index')) ||
    ok({}),
})

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }
