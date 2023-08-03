import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('@ucanto/interface').ConnectionView<import('./types.js').AggregatorService>} ConnectionView
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
 * @param {string} space
 * @param {string} group
 * @param {import('./types.js').RequestOptions} [options]
 */
export async function pieceAdd(
  { issuer, with: resource, proofs, audience },
  piece,
  space,
  group,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = FilecoinCapabilities.pieceAdd.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STORE_FRONT.principal,
    with: resource,
    nb: {
      group,
      space,
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
