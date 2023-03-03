/**
 * Voucher Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/capabilities/voucher'
 * ```
 *
 * @module
 */
import { capability, URI, DID, Schema } from '@ucanto/validator'
import { equalWith, fail, equal } from './utils.js'
export { top } from './top.js'

/**
 * Products are identified by the CID of the DAG that describes them.
 */
export const Product = URI.uri()

/**
 * Verifiable identity to whom voucher is issued. Currently it is a `mailto:`
 * URL.
 */
export const Identity = URI.match({ protocol: 'mailto:' })

/**
 * Services are identified using a decentralized identifier.
 */
export const Service = DID.match({})

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `voucher/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 *
 * Currently DID in the `with` field will always be web3.storage DID since we
 * do not support other types of vouchers yet.
 */
export const voucher = capability({
  can: 'voucher/*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

/**
 * Capability can be invoked by an agent to claim a voucher for a specific
 * user identifier (currently email address).
 *
 * The agent MAY issue claim with own DID or a DID it is delegate of. If `with`
 * is different from `iss`, it is implied that the voucher is claimed for the
 * DID in the `with` field. If `with` is same as `iss` it is implies that
 * voucher is claimed for an unspecified `did`.
 */
export const claim = capability({
  can: 'voucher/claim',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * URI of the product agent is requesting a voucher of.
     */
    product: Product,
    /**
     * Verifiable identity on who's behalf behalf claim is made.
     */
    identity: Identity,
    /**
     * Optional service DID who's voucher is been requested.
     */
    service: Service.optional(),
  }),
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(equal(child.nb.product, parent.nb.product, 'product')) ||
      fail(equal(child.nb.identity, parent.nb.identity, 'identity')) ||
      fail(equal(child.nb.service, parent.nb.service, 'service')) ||
      true
    )
  },
})

export const redeem = capability({
  can: 'voucher/redeem',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * Link of the product voucher is for. Must be the same as `nb.product`
     * of `voucher/claim` that requested this.
     */
    product: Product,
    /**
     * Verifiable identity to whom voucher is issued. It is a `mailto:` URL
     * where this delegation is typically sent.
     */
    identity: Identity,
    /**
     * Space identifier where voucher can be redeemed. When service delegates
     * `voucher/redeem` to the user agent it may omit this field to allow
     * agent to choose space.
     */
    space: URI.match({ protocol: 'did:' }),
  }),
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(equal(child.nb.product, parent.nb.product, 'product')) ||
      fail(equal(child.nb.identity, parent.nb.identity, 'identity')) ||
      fail(equal(child.nb.space, parent.nb.space, 'account')) ||
      true
    )
  },
})
