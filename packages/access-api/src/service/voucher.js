import * as API from '../api.js'
import * as Claim from './voucher-claim.js'
import * as Redeem from './voucher-redeem.js'

/**
 * @param {API.RouteContext} context
 */
export const provide = (context) => ({
  claim: Claim.provide(context),
  redeem: Redeem.provide(context),
})
