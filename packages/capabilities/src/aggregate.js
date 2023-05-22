/**
 * Aggregate Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Aggregate from '@web3-storage/capabilities/aggregate'
 * ```
 *
 * @module
 */
import { capability, Link, URI, Schema } from '@ucanto/validator'

/**
 * `aggregate/offer` capability allows agent to create an offer to get an aggregate
 * of CARs files in the market to be fetched and stored by a Storage provider.
 * TODO: below
 * identified by did:key in the `with` field. Agent must precompute CAR locally
 * and provide it's CID and size using `nb.link` and `nb.size` fields, allowing
 * a service to provision a write location for the agent to PUT or POST desired
 * CAR into.
 */
export const offer = capability({
  can: 'aggregate/offer',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * CID of the DAG-CBOR encoded block with offer details.
     * Service will queue given offer to be validated and handled.
     */
    offer: Link,
    /**
     * Commitment proof for the aggregate being offered.
     */
    commitmentProof: Schema.string(),
    /**
     * Size of the combined CAR files to be offered as aggregate.
     */
    size: Schema.integer(),
  }),
})

/**
 * Capability can be used to get information about previously stored aggregates.
 * space identified by `with` field.
 */
export const get = capability({
  can: 'aggregate/get',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * Commitment proof for the aggregate being requested.
     */
    commitmentProof: Schema.string(),
  }),
})

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema, Link }
