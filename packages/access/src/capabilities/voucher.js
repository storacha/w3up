import { capability, URI, Text } from '@ucanto/validator'
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
    nb: {
      product: Text,
      identity: Text,
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

export const redeem = capability({
  can: 'voucher/redeem',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    product: URI.match({ protocol: 'product:' }),
    identity: Text,
    account: URI.match({ protocol: 'did:' }),
  },
})
