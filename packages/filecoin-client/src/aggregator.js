import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as Aggregator from '@web3-storage/capabilities/filecoin/aggregator'
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
 * Request that a piece be aggregated for inclusion in an upcoming an Filecoin
 * deal.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {string} group
 * @param {import('./types.js').RequestOptions<AggregatorService>} [options]
 */
export async function pieceOffer(
  { issuer, with: resource, proofs, audience },
  piece,
  group,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Aggregator.pieceOffer.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      piece,
      group,
    },
    proofs,
  })

  return await invocation.execute(conn)
}

/**
 * Signal a piece has been accepted or rejected for inclusion in an aggregate.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {string} group
 * @param {import('./types.js').RequestOptions<AggregatorService>} [options]
 */
export async function pieceAccept(
  { issuer, with: resource, proofs, audience },
  piece,
  group,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Aggregator.pieceAccept.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      piece,
      group,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
