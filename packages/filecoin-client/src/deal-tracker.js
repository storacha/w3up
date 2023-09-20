import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DealTracker from '@web3-storage/capabilities/filecoin/deal-tracker'
import { services } from './service.js'

/**
 * @typedef {import('./types.js').DealTrackerService} DealTrackerService
 * @typedef {import('@ucanto/interface').ConnectionView<DealTrackerService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.DEAL_TRACKER.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.DEAL_TRACKER.url,
    method: 'POST',
  }),
})

/**
 * Get deal information for a given piece.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions<DealTrackerService>} [options]
 */
export async function dealInfo(
  { issuer, with: resource, proofs, audience },
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = DealTracker.dealInfo.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.DEAL_TRACKER.principal,
    with: resource,
    nb: {
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
