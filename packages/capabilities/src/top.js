/**
 * Top Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/capabilities/top'
 * ```
 *
 * @module
 */

import { capability, Schema } from '@ucanto/validator'
import { equalWith } from './utils.js'

/**
 * Represents the top `{ can: '*', with: 'did:key:zAlice' }` capability, which we often
 * also call account linking.
 *
 * @see {@link https://github.com/ucan-wg/spec#52-top}
 */
export const top = capability({
  can: '*',
  with: Schema.or(Schema.did(), Schema.literal('ucan:*')),
  derives: equalWith,
})
