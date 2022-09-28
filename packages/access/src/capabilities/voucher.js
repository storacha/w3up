import { capability, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { canDelegateURI, equalWith } from './utils.js'

/**
 * @param {Types.Failure | true} value
 */
function fail(value) {
  return value === true ? undefined : value
}

export const voucher = capability({
  can: 'voucher/*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

export const claim = voucher.derive({
  to: capability({
    can: 'voucher/claim',
    with: URI.match({ protocol: 'did:' }),
    caveats: {
      product: URI.string(),
      identity: URI.string(),
      service: URI.string({ protocol: 'did:' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(canDelegateURI(child.caveats.identity, parent.caveats.identity)) ||
        fail(canDelegateURI(child.caveats.product, parent.caveats.product)) ||
        fail(canDelegateURI(child.caveats.service, parent.caveats.service)) ||
        true
      )
    },
  }),
  derives: equalWith,
})

export const redeem = capability({
  can: 'voucher/redeem',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    product: URI.string(),
    identity: URI.string(),
    // TODO need optional URI from ucanto
    account: URI.string({ protocol: 'did:' }),
  },
})
