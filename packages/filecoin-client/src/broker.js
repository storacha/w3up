import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { CBOR } from '@ucanto/core'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('@ucanto/interface').ConnectionView<import('./types.js').BrokerService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.BROKER.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.BROKER.url,
    method: 'POST',
  }),
})

/**
 * Add a piece (aggregate) to the broker system of the filecoin pipeline to offer to SPs.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('@web3-storage/data-segment').PieceLink[]} offer
 * @param {import('./types.js').DealConfig} deal
 * @param {import('./types.js').RequestOptions} [options]
 */
export async function aggregateAdd(
  { issuer, with: resource, proofs, audience },
  piece,
  offer,
  deal,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const block = await CBOR.write(offer)
  const invocation = FilecoinCapabilities.aggregateAdd.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      piece,
      offer: block.cid,
      deal,
    },
    proofs,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}
