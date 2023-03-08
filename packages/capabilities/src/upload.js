/**
 * Upload Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/capabilities/upload'
 * ```
 *
 * @module
 */
import { capability, Link, URI, Schema } from '@ucanto/validator'
import { codec as CAR } from '@ucanto/transport/car'
import { equalWith, fail, equal } from './utils.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `upload/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 */
export const upload = capability({
  can: 'upload/*',
  /**
   * did:key identifier of the (memory) space where upload is add to the
   * upload list.
   */
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

/**
 * Schema representing a link (a.k.a CID) to a CAR file. Enforces CAR codec code and CID v1.
 */
const CARLink = Link.match({ code: CAR.code, version: 1 })

/**
 * Capability allows an agent to add an arbitrary DAG (root) to the upload list
 * of the specified (memory) space (identified by did:key in the `with` field).
 * It is recommended to provide an optional list of shard links that contain
 * fragments of this DAG, as it allows system to optimize block discovery, it is
 * also a way to communicate DAG partiality - this upload contains partial DAG
 * identified by the given `root`.
 *
 * Usually when agent wants to upload a DAG it will encode it as a one or more
 * CAR files (shards) and invoke `store/add` capability for each one. Once all
 * shards are stored it will invoke `upload/add` capability (providing link to
 * a DAG root and all the shards) to add it the upload list.
 *
 * That said `upload/add` could be invoked without invoking `store/add`s e.g.
 * because another (memory) space may already have those CARs.
 *
 * Note: If DAG with the given root is already in the upload list, invocation
 * will simply update `shards` to be a union of existing and new shards.
 */
export const add = capability({
  can: 'upload/add',
  /**
   * did:key identifier of the (memory) space where uploaded is added.
   */
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * Root CID of the DAG to be added to the upload list.
     */
    root: Link,
    /**
     * CIDs to the CAR files that contain blocks of the DAG.
     */
    shards: CARLink.array().optional(),
  }),
  derives: (self, from) => {
    return (
      fail(equalWith(self, from)) ||
      fail(equal(self.nb.root, from.nb.root, 'root')) ||
      fail(equal(self.nb.shards, from.nb.shards, 'shards')) ||
      true
    )
  },
})

/**
 * Capability removes an upload (identified by it's root CID) from the upload
 * list. Please note that removing an upload does not delete corresponding shards
 * from the store, however that could be done via `store/remove` invocations.
 */
export const remove = capability({
  can: 'upload/remove',
  /**
   * did:key identifier of the (memory) space where uploaded is removed from.
   */
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * Root CID of the DAG to be removed from the upload list.
     */
    root: Link,
  }),
  derives: (self, from) => {
    return (
      fail(equalWith(self, from)) ||
      fail(equal(self.nb.root, from.nb.root, 'root')) ||
      true
    )
  },
})

/**
 * Capability can be invoked to request a list of uploads in the (memory) space
 * identified by the `with` field.
 */
export const list = capability({
  can: 'upload/list',
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
})

export const all = add.or(remove).or(list)

// ⚠️ We export imports here so they are not omitted in generated typedefs
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Link, Schema }
