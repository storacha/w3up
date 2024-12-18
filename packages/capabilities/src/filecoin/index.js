/**
 * Filecoin Capabilities
 *
 * These capabilities are the entrypoint to the filecoin pipeline and are
 * aliases for the filecoin storefront capabilities.
 *
 * These can be imported directly with:
 * ```js
 * import * as Filecoin from '@web3-storage/capabilities/filecoin'
 * ```
 *
 * @module
 */

export {
  filecoinOffer as offer,
  filecoinSubmit as submit,
  filecoinAccept as accept,
  filecoinInfo as info,
  filecoin as filecoin,
} from './storefront.js'
