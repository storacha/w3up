import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('./types.js').AggregatorService} AggregatorService
 * @typedef {import('@ucanto/interface').ConnectionView<AggregatorService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.AGGREGATOR.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.AGGREGATOR.url,
    method: 'POST',
  }),
})

/**
 * Add a piece to the aggregator system of the filecoin pipeline.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {string} storefront
 * @param {string} group
 * @param {import('./types.js').RequestOptions<AggregatorService>} [options]
 */
export async function aggregateAdd(
  { issuer, with: resource, proofs, audience },
  piece,
  storefront,
  group,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = FilecoinCapabilities.aggregateAdd.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      piece,
      storefront,
      group,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
