/**
 * Store Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/capabilities/store'
 * ```
 *
 * @module
 */
import { capability, Failure, Link, URI, Schema } from '@ucanto/validator'
import { equalLink, equalWith } from './utils.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `store/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 */
export const store = capability({
  can: 'store/*',
  /**
   * did:key identifier of the (memory) space where CAR is intended to
   * be stored.
   */
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

/**
 * `store/add` capability allows agent to store a CAR file into a (memory) space
 * identified by did:key in the `with` field. Agent must precompute CAR locally
 * and provide it's CID and size using `nb.link` and `nb.size` fields, allowing
 * a service to provision a write location for the agent to PUT or POST desired
 * CAR into.
 */
export const add = capability({
  can: 'store/add',
  /**
   * did:key identifier of the (memory) space where CAR is intended to
   * be stored.
   */
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * CID of the CAR file to be stored. Service will provision write target
     * for this exact CAR file for agent to PUT or POST it. Attempt to write
     * any other content will fail.
     */
    link: Link,
    /**
     * Size of the CAR file to be stored. Service will provision write target
     * for this exact size. Attempt to write a larger CAR file will fail.
     */
    size: Schema.integer(),
    /**
     * Agent may optionally provide a link to a related CAR file using `origin`
     * field. This is useful when storing large DAGs, agent could shard it
     * across multiple CAR files and then link each shard with a previous one.
     *
     * Providing this relation tells service that given CAR is shard of the
     * larger DAG as opposed to it being intentionally partial DAG. When DAG is
     * not sharded, there will be only one `store/add` with `origin` left out.
     */
    origin: Link.optional(),
  }),
  derives: (claim, from) => {
    const result = equalLink(claim, from)
    if (result.error) {
      return result
    } else if (claim.nb.size !== undefined && from.nb.size !== undefined) {
      return claim.nb.size > from.nb.size
        ? new Failure(
            `Size constraint violation: ${claim.nb.size} > ${from.nb.size}`
          )
        : true
    } else {
      return true
    }
  },
})

/**
 * Capability can be used to remove the stored CAR file from the (memory)
 * space identified by `with` field.
 */
export const remove = capability({
  can: 'store/remove',
  /**
   * did:key identifier of the (memory) space where CAR is intended to
   * be stored.
   */
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * CID of the CAR file to be removed from the store.
     */
    link: Link,
  }),
  derives: equalLink,
})

/**
 * Capability can be invoked to request a list of stored CAR files in the
 * (memory) space identified by `with` field.
 */
export const list = capability({
  can: 'store/list',
  /**
   * did:key identifier of the (memory) space where CAR is intended to
   * be stored.
   */
  with: URI.match({ protocol: 'did:' }),
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
    /**
     * If true, return page of results preceding cursor. Defaults to false.
     */
    pre: Schema.boolean().optional(),
  }),
  derives: (claimed, delegated) => {
    if (claimed.with !== delegated.with) {
      return new Failure(
        `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
      )
    }
    return true
  },
})

export const all = add.or(remove).or(list)

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema, Link }
