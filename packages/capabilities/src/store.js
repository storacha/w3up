/**
 * Store Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Store from '@web3-storage/capabilities/store'
 * ```
 *
 * @module
 */
import { capability, Link, Schema, ok, fail } from '@ucanto/validator'
import { equalLink, equalWith, SpaceDID } from './utils.js'

// @see https://github.com/multiformats/multicodec/blob/master/table.csv#L140
export const code = 0x0202

export const CARLink = Schema.link({ code, version: 1 })

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `store/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const store = capability({
  can: 'store/*',
  /**
   * DID of the (memory) space where CAR is intended to
   * be stored.
   */
  with: SpaceDID,
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
   * DID of the (memory) space where CAR is intended to
   * be stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * CID of the CAR file to be stored. Service will provision write target
     * for this exact CAR file for agent to PUT or POST it. Attempt to write
     * any other content will fail.
     */
    link: CARLink,
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
        ? fail(`Size constraint violation: ${claim.nb.size} > ${from.nb.size}`)
        : ok({})
    } else {
      return ok({})
    }
  },
})

/**
 * Capability to get store metadata by shard CID.
 * Use to check for inclusion, or get shard size and origin
 *
 * `nb.link` is optional to allow delegation of `store/get`
 * capability for any shard CID. If link is specified, then the
 * capability only allows a get for that specific CID.
 *
 * When used as as an invocation, `nb.link` must be specified.
 */
export const get = capability({
  can: 'store/get',
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * shard CID to fetch info about.
     */
    link: CARLink.optional(),
  }),
  derives: equalLink,
})

/**
 * Capability can be used to remove the stored CAR file from the (memory)
 * space identified by `with` field.
 */
export const remove = capability({
  can: 'store/remove',
  /**
   * DID of the (memory) space where CAR is intended to
   * be stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * CID of the CAR file to be removed from the store.
     */
    link: CARLink,
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
   * DID of the (memory) space where CAR is intended to
   * be stored.
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
    /**
     * If true, return page of results preceding cursor. Defaults to false.
     */
    pre: Schema.boolean().optional(),
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

export const all = add.or(remove).or(list)

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema, Link }
