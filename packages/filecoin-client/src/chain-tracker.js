import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('@ucanto/interface').ConnectionView<import('./types.js').ChainTrackerService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.CHAIN_TRACKER.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.CHAIN_TRACKER.url,
    method: 'POST',
  }),
})

/**
 * Get chain information for a given a piece..
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions} [options]
 */
export async function chainInfo(
  { issuer, with: resource, proofs, audience },
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = FilecoinCapabilities.chainTrackerInfo.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.CHAIN_TRACKER.principal,
    with: resource,
    nb: {
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
