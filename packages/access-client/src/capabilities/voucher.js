/**
 * Voucher Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/access/capabilities/voucher'
 * ```
 *
 * @module
 */
import { capability, URI } from '@ucanto/validator'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { canDelegateURI, equalWith, fail } from './utils.js'
import { any } from './wildcard.js'

export const voucher = any.derive({
  to: capability({
    can: 'voucher/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = any.or(voucher)

export const claim = base.derive({
  to: capability({
    can: 'voucher/claim',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      product: URI.match({ protocol: 'product:' }),
      identity: URI.match({ protocol: 'mailto:' }),
      service: URI.match({ protocol: 'did:' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
        fail(canDelegateURI(child.nb.product, parent.nb.product)) ||
        fail(canDelegateURI(child.nb.service, parent.nb.service)) ||
        true
      )
    },
  }),
  derives: equalWith,
})

export const redeem = voucher.derive({
  to: capability({
    can: 'voucher/redeem',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      product: URI.match({ protocol: 'product:' }),
      identity: URI.match({ protocol: 'mailto:' }),
      account: URI.match({ protocol: 'did:' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
        fail(canDelegateURI(child.nb.product, parent.nb.product)) ||
        fail(canDelegateURI(child.nb.account, parent.nb.account)) ||
        true
      )
    },
  }),
  derives: equalWith,
})
