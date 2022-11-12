import { capability, URI, DID } from '@ucanto/validator'
import { equalWith, equal, fail } from './utils.js'
import { any } from './any.js'

/**
 * Products are identified by a did:key identifier.
 */
export const Product = DID.match({ method: 'key' })

/**
 * Verifiable identity to whom voucher is issued. Currently it is a `mailto:`
 * URL.
 */
export const Identity = URI.match({ protocol: 'mailto:' })

/**
 * Services are identified using did:key identifier.
 */
export const Service = DID.match({ method: 'key' })
/**
 * Spaces are identified using did:key identifier.
 */
export const Account = DID.match({ method: 'key' })

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `voucher/` prefixed capability for the (memory) space identified
 * by did:key in the `with` field.
 *
 * Currently DID in the `with` field will always be web3.storage DID since we
 * do not support other types of vouchers yet.
 */
export const voucher = any.derive({
  to: capability({
    can: 'voucher/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = any.or(voucher)

/**
 * Capability can be invoked by an agent to claim a voucher for a specific
 * product (identified by `nb.product` DID) for a verifiable identifier
 * (currently email address).
 */
export const claim = base.derive({
  to: capability({
    can: 'voucher/claim',
    with: Account,
    nb: {
      /**
       * DID of the product agent is requesting a voucher/redeem for.
       */
      product: Product,
      /**
       * Verifiable identity on who's behalf behalf claim is made.
       */
      // Once we roll out DKIM based system we could consider just
      // using did:mailto: in with field.
      identity: Identity,
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(equal(child.nb.product, parent.nb.product, 'product')) ||
        fail(equal(child.nb.identity, parent.nb.identity, 'identity')) ||
        true
      )
    },
  }),
  /**
   * `voucher/claim` can be derived from the `voucher/*` & `*` capability
   * as long as the `with` fields match.
   */
  derives: equalWith,
})

export const redeem = voucher.derive({
  to: capability({
    can: 'voucher/redeem',
    /**
     * DID of the product which can be installed into a space by invoking
     * this capability.
     */
    with: Product,
    nb: {
      /**
       * Verifiable identity to whom voucher is issued. It is a `mailto:` URL
       * where this delegation was sent.
       */
      identity: Identity,
      /**
       * Space identifier where voucher can be redeemed. When service delegates
       * `vourche/redeem` to the user agent it may omit this field to allow
       * account to choose account.
       */
      account: Account,
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(equal(child.nb.identity, parent.nb.identity, 'identity')) ||
        fail(equal(child.nb.account, parent.nb.account, 'account')) ||
        true
      )
    },
  }),
  /**
   * `voucher/redeem` can be derived from the `voucher/*` & `*` capability
   * as long as the `with` fields match.
   */
  derives: equalWith,
})
