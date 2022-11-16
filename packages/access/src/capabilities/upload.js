import { capability, Link, URI } from '@ucanto/validator'
import { codec as CAR } from '@ucanto/transport/car'
import { equalWith, fail, equal } from './utils.js'
import { any } from './any.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `upload/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 */
export const upload = any.derive({
  to: capability({
    can: 'upload/*',
    /**
     * did:key identifier of the (memory) space where upload is add to the
     * upload list.
     */
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  /**
   * `upload/*` can be derived from the `*` capability as long as `with` field
   * is the same.
   */
  derives: equalWith,
})

// Right now ucanto does not yet has native `*` support, which means
// `upload/add` can not be derived from `*` event though it can be
// derived from `upload/*`. As a workaround we just define base capability
// here so all store capabilities could be derived from either `*` or
// `upload/*`.
const base = any.or(upload)

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
export const add = base.derive({
  to: capability({
    can: 'upload/add',
    /**
     * did:key identifier of the (memory) space where uploaded is added.
     */
    with: URI.match({ protocol: 'did:' }),
    nb: {
      /**
       * Root CID of the DAG to be added to the upload list.
       */
      root: Link,
      /**
       * CIDs to the CAR files that contain blocks of the DAG.
       */
      shards: CARLink.array().optional(),
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.nb.root, from.nb.root, 'root')) ||
        fail(equal(self.nb.shards, from.nb.shards, 'shards')) ||
        true
      )
    },
  }),
  /**
   * `upload/add` can be derived from the `upload/*` & `*` capability
   * as long as `with` fields match.
   */
  derives: equalWith,
})

/**
 * Capability removes an upload (identified by it's root CID) from the upload
 * list. Please note that removing an upload does not delete corresponding shards
 * from the store, however that could be done via `store/remove` invocations.
 */
export const remove = base.derive({
  to: capability({
    can: 'upload/remove',
    /**
     * did:key identifier of the (memory) space where uploaded is removed from.
     */
    with: URI.match({ protocol: 'did:' }),
    nb: {
      /**
       * Root CID of the DAG to be removed from the upload list.
       */
      root: Link,
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.nb.root, from.nb.root, 'root')) ||
        true
      )
    },
  }),
  /**
   * `upload/remove` can be derived from the `upload/*` & `*` capability
   * as long as `with` fields match.
   */
  derives: equalWith,
})

/**
 * Capability can be invoked to request a list of uploads in the (memory) space
 * identified by the `with` field.
 */
export const list = base.derive({
  to: capability({
    can: 'upload/list',
    with: URI.match({ protocol: 'did:' }),
  }),
  /**
   * `upload/list` can be derived from the `upload/*` & `*` capability
   * as long as with fields match.
   */
  derives: equalWith,
})

// ⚠️ We export imports here so they are not omited in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Link }
