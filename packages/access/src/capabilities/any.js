import { capability, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { canDelegateURI, derives, equalWith } from './utils.js'

/**
 * Represets `{ can: '*', with: 'did:key:zAlice' }` capability, which we often
 * also call account linking.
 */
export const any = capability({
  can: '*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})
