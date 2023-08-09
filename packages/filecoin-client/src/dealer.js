import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { CBOR } from '@ucanto/core'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('./types.js').DealerService} DealerService
 * @typedef {import('@ucanto/interface').ConnectionView<DealerService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.DEALER.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.DEALER.url,
    method: 'POST',
  }),
})

/**
 * Add a piece (aggregate) to the dealer system of the filecoin pipeline to offer to SPs.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').LegacyPieceLink} aggregate
 * @param {import('@web3-storage/data-segment').PieceLink[]} pieces
 * @param {string} storefront
 * @param {string} label
 * @param {import('./types.js').RequestOptions<DealerService>} [options]
 */
export async function dealAdd(
  { issuer, with: resource, proofs, audience },
  aggregate,
  pieces,
  storefront,
  label,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const block = await CBOR.write(pieces)
  const invocation = FilecoinCapabilities.dealAdd.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      aggregate,
      pieces: block.cid,
      storefront,
      label,
    },
    proofs,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}
