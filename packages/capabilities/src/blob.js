/**
 * Blob Capabilities.
 *
 * Blob is a fixed size byte array addressed by the multihash.
 * Usually blobs are used to represent set of IPLD blocks at different byte ranges.
 *
 * These can be imported directly with:
 * ```js
 * import * as Blob from '@web3-storage/capabilities/blob'
 * ```
 *
 * @module
 */
import { capability, Schema } from '@ucanto/validator'
import { equalBlob, equalWith, SpaceDID } from './utils.js'

/**
 * Agent capabilities for Blob protocol
 */

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `blob/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const blob = capability({
  can: 'blob/*',
  /**
   * DID of the (memory) space where Blob is intended to
   * be stored.
   */
  with: SpaceDID,
  derives: equalWith,
})

/**
 * Blob description for being ingested by the service.
 */
export const content = Schema.struct({
  /**
   * A multihash digest of the blob payload bytes, uniquely identifying blob.
   */
  digest: Schema.bytes(),
  /**
   * Number of bytes contained by this blob. Service will provision write target
   * for this exact size. Attempt to write a larger Blob file will fail.
   */
  size: Schema.integer(),
})

/**
 * `blob/add` capability allows agent to store a Blob into a (memory) space
 * identified by did:key in the `with` field. Agent should compute blob multihash
 * and size and provide it under `nb.blob` field, allowing a service to provision
 * a write location for the agent to PUT desired Blob into.
 */
export const add = capability({
  can: 'blob/add',
  /**
   * DID of the (memory) space where Blob is intended to
   * be stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * Blob to be added on the space.
     */
    blob: content,
  }),
  derives: equalBlob,
})

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }
