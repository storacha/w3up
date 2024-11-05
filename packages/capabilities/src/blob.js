/**
 * Blob Capabilities.
 *
 * The blob protocol allows authorized agents allocate memory space on a storage
 * node and subsequently verify the content has been accepted by / delivered to
 * said node.
 *
 * These can be imported directly with:
 * ```js
 * import * as Index from '@storacha/capabilities/blob'
 * ```
 *
 * @module
 * @see https://github.com/storacha/specs/blob/main/w3-blob.md
 */
import { capability, Schema, Link, ok } from '@ucanto/validator'
import { content } from './space/blob.js'
import {
  equalBlob,
  equalWith,
  SpaceDID,
  and,
  equal,
  checkLink,
  Await,
} from './utils.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derive any `blob/` prefixed capability.
 */
export const blob = capability({
  can: 'blob/*',
  /** Storage provider DID. */
  with: Schema.did(),
  derives: equalWith,
})

/**
 * The `blob/allocate` capability can be invoked to create a memory address on a
 * storage node where blob content can be written via a HTTP PUT request.
 */
export const allocate = capability({
  can: 'blob/allocate',
  /** Storage provider DID. */
  with: Schema.did(),
  nb: Schema.struct({
    /** Blob to allocate. */
    blob: content,
    /** Link to the add blob task that initiated the allocation. */
    cause: Schema.link({ version: 1 }),
    /** DID of the user space where the allocation takes place. */
    space: SpaceDID,
  }),
  derives: (claimed, delegated) =>
    and(equalWith(claimed, delegated)) ||
    and(equalBlob(claimed, delegated)) ||
    and(checkLink(claimed.nb.cause, delegated.nb.cause, 'cause')) ||
    and(equal(claimed.nb.space, delegated.nb.space, 'space')) ||
    ok({}),
})

/**
 * The `blob/accept` capability invocation should either succeed when content is
 * delivered on allocated address or fail if no content is allocation expires
 * without content being delivered.
 */
export const accept = capability({
  can: 'blob/accept',
  /** Storage provider DID. */
  with: Schema.did(),
  nb: Schema.struct({
    /** Blob to accept. */
    blob: content,
    /** DID of the user space where allocation took place. */
    space: SpaceDID,
    /** This task is blocked on `http/put` receipt available */
    _put: Await,
  }),
  derives: (claimed, delegated) =>
    and(equalWith(claimed, delegated)) ||
    and(equalBlob(claimed, delegated)) ||
    and(equal(claimed.nb.space, delegated.nb.space, 'space')) ||
    ok({}),
})

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema, Link }
