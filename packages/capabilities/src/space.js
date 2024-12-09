/**
 * Space Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Space from '@web3-storage/capabilities/space'
 * ```
 *
 * @module
 */

import * as Store from './store.js'
import { capability, Schema, ok, fail } from '@ucanto/validator'
import { SpaceDID, equalWith } from './utils.js'
import * as Upload from './upload.js'
export { top } from './top.js'

// Need this to workaround TS bug
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Store }

export const space = capability({
  can: 'space/*',
  with: SpaceDID,
  derives: equalWith,
})

/**
 * `space/info` can be derived from any of the `store/*`
 * capability that has matching `with`. This allows store service
 * to identify account based on any user request.
 */
export const info = Store.add
  .or(Store.list)
  .or(Store.remove)
  .or(Upload.add)
  .or(Upload.list)
  .or(Upload.remove)
  .derive({
    to: capability({
      can: 'space/info',
      with: SpaceDID,
    }),
    derives: equalWith,
  })

export const allocate = capability({
  can: 'space/allocate',
  with: SpaceDID,
  nb: Schema.struct({
    size: Schema.integer(),
  }),
  derives: (child, parent) => {
    const result = equalWith(child, parent)
    if (result.ok) {
      return child.nb.size <= parent.nb.size
        ? ok({})
        : fail(
            `Claimed size ${child.nb.size} escalates delegated size ${parent.nb.size}`
          )
    } else {
      return result
    }
  },
})

/**
 * "Manage the serving of content owned by the subject Space."
 *
 * A Principal who may `space/content/serve/*` is permitted to perform all
 * operations related to serving content owned by the Space, including actually
 * serving it and recording egress charges.
 */
export const contentServe = capability({
  can: 'space/content/serve/*',
  /**
   * The Space which contains the content. This Space will be charged egress
   * fees if content is actually retrieved by way of this invocation.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /** The authorization token, if any, used for this request. */
    token: Schema.string().nullable(),
  }),
  derives: equalWith,
})

/**
 * "Serve content owned by the subject Space over HTTP."
 *
 * A Principal who may `space/content/serve/transport/http` is permitted to
 * serve any content owned by the Space, in the manner of an [IPFS Gateway]. The
 * content may be a Blob stored by a Storage Node, or indexed content stored
 * within such Blobs (ie, Shards).
 *
 * Note that the args do not currently specify *what* content should be served.
 * Invoking this command does not currently *serve* the content in any way, but
 * merely validates the authority to do so. Currently, the entirety of a Space
 * must use the same authorization, thus the content does not need to be
 * identified. In the future, this command may refer directly to a piece of
 * content by CID.
 *
 * [IPFS Gateway]: https://specs.ipfs.tech/http-gateways/path-gateway/
 */
export const transportHttp = capability({
  can: 'space/content/serve/transport/http',
  /**
   * The Space which contains the content. This Space will be charged egress
   * fees if content is actually retrieved by way of this invocation.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /** The authorization token, if any, used for this request. */
    token: Schema.string().nullable(),
  }),
  derives: equalWith,
})

/**
 * Capability can be invoked by an agent to record egress data for a given resource.
 * It can be derived from any of the `space/content/serve/*` capability that has matching `with`.
 */
export const egressRecord = capability({
  can: 'space/content/serve/egress/record',
  with: SpaceDID,
  nb: Schema.struct({
    /** CID of the resource that was served. */
    resource: Schema.link(),
    /** Amount of bytes served. */
    bytes: Schema.integer().greaterThan(0),
    /** Timestamp of the event in milliseconds after Unix epoch. */
    servedAt: Schema.integer().greaterThan(-1),
  }),
  derives: equalWith,
})
