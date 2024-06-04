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
import { equals } from 'uint8arrays/equals'
import { capability, Schema, fail, ok } from '@ucanto/validator'
import { equalBlob, equalWith, SpaceDID } from './utils.js'

/**
 * Agent capabilities for Blob protocol
 */

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `space/blob/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const blob = capability({
  can: 'space/blob/*',
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
 * `space/blob/add` capability allows agent to store a Blob into a (memory) space
 * identified by did:key in the `with` field. Agent should compute blob multihash
 * and size and provide it under `nb.blob` field, allowing a service to provision
 * a write location for the agent to PUT desired Blob into.
 */
export const add = capability({
  can: 'space/blob/add',
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

/**
 * Capability can be used to remove the stored Blob from the (memory)
 * space identified by `with` field.
 */
export const remove = capability({
  can: 'space/blob/remove',
  /**
   * DID of the (memory) space where Blob is stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * A multihash digest of the blob payload bytes, uniquely identifying blob.
     */
    digest: Schema.bytes(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return fail(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.digest &&
      !equals(delegated.nb.digest, claimed.nb.digest)
    ) {
      return fail(
        `Link ${
          claimed.nb.digest ? `${claimed.nb.digest}` : ''
        } violates imposed ${delegated.nb.digest} constraint.`
      )
    }
    return ok({})
  },
})

/**
 * Capability can be invoked to request a list of stored Blobs in the
 * (memory) space identified by `with` field.
 */
export const list = capability({
  can: 'space/blob/list',
  /**
   * DID of the (memory) space where Blobs to be listed are stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * A pointer that can be moved back and forth on the list.
     * It can be used to paginate a list for instance.
     */
    cursor: Schema.string().optional(),
    /**
     * Maximum number of items per page.
     */
    size: Schema.integer().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return fail(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    }
    return ok({})
  },
})

/**
 * Capability can be used to get the stored Blob from the (memory)
 * space identified by `with` field.
 */
export const get = capability({
  can: 'space/blob/get/0/1',
  /**
   * DID of the (memory) space where Blob is stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * A multihash digest of the blob payload bytes, uniquely identifying blob.
     */
    digest: Schema.bytes(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return fail(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    } else if (
      delegated.nb.digest &&
      !equals(delegated.nb.digest, claimed.nb.digest)
    ) {
      return fail(
        `Link ${
          claimed.nb.digest ? `${claimed.nb.digest}` : ''
        } violates imposed ${delegated.nb.digest} constraint.`
      )
    }
    return ok({})
  },
})

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }
