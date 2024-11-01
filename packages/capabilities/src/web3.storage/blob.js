import { capability, Schema, Link, ok } from '@ucanto/validator'
import { content } from '../blob.js'
import {
  equalBlob,
  equalWith,
  SpaceDID,
  and,
  equal,
  checkLink,
  Await,
} from '../utils.js'

/**
 * Service capabilities for Blob protocol
 */
/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `web3.storage/blob/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const blob = capability({
  can: 'web3.storage/blob/*',
  /**
   * DID of the (memory) space where Blob is intended to
   * be stored.
   */
  with: SpaceDID,
  derives: equalWith,
})

/**
 * `web3.storage/blob//allocate` capability can be invoked to create a memory
 * address where blob content can be written via HTTP PUT request.
 */
export const allocate = capability({
  can: 'web3.storage/blob/allocate',
  /**
   * Provider DID.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Blob to allocate on the space.
     */
    blob: content,
    /**
     * The Link for an Add Blob task, that caused an allocation
     */
    cause: Link,
    /**
     * DID of the user space where allocation takes place
     */
    space: SpaceDID,
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(equalBlob(claim, from)) ||
      and(checkLink(claim.nb.cause, from.nb.cause, 'cause')) ||
      and(equal(claim.nb.space, from.nb.space, 'space')) ||
      ok({})
    )
  },
})

/**
 * `blob/accept` capability invocation should either succeed when content is
 * delivered on allocated address or fail if no content is allocation expires
 * without content being delivered.
 */
export const accept = capability({
  can: 'web3.storage/blob/accept',
  /**
   * Provider DID.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Blob to accept.
     */
    blob: content,
    /**
     * Content location commitment time to live, which will be encoded as expiry of the issued location claim.
     */
    ttl: Schema.integer().optional(),
    /**
     * DID of the user space where allocation took place
     */
    space: SpaceDID,
    /**
     * This task is blocked on `http/put` receipt available
     */
    _put: Await,
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(equalBlob(claim, from)) ||
      and(equal(claim.nb.ttl, from.nb.ttl, 'ttl')) ||
      and(equal(claim.nb.space, from.nb.space, 'space')) ||
      ok({})
    )
  },
})

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema, Link }
