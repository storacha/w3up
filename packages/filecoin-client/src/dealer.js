import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { CBOR } from '@ucanto/core'
import * as Dealer from '@web3-storage/capabilities/filecoin/dealer'
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
 * Request an aggregate to be added to a deal with a Storage Provider.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} aggregate
 * @param {import('@web3-storage/data-segment').PieceLink[]} pieces
 * @param {import('./types.js').RequestOptions<DealerService>} [options]
 */
export async function aggregateOffer(
  { issuer, with: resource, proofs, audience },
  aggregate,
  pieces,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const block = await CBOR.write(pieces)
  const invocation = Dealer.aggregateOffer.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      aggregate,
      pieces: block.cid,
    },
    proofs,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}

/**
 * Signal an aggregate has been accepted for inclusion in a Filecoin deal.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} aggregate
 * @param {import('@web3-storage/data-segment').PieceLink[]} pieces
 * @param {import('./types.js').RequestOptions<DealerService>} [options]
 */
export async function aggregateAccept(
  { issuer, with: resource, proofs, audience },
  aggregate,
  pieces,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const block = await CBOR.write(pieces)
  const invocation = Dealer.aggregateAccept.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      aggregate,
      pieces: block.cid,
    },
    proofs,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}
