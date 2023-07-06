import * as AggregateCapabilities from '@web3-storage/capabilities/aggregate'
import { CBOR } from '@ucanto/core'

import { servicePrincipal, connection } from './service.js'

export const MIN_SIZE = 1 + 127 * (1 << 27)
export const MAX_SIZE = 127 * (1 << 28)

/**
 * Offer an aggregate to be assembled and stored.
 *
 * @param {import('./types').InvocationConfig} conf - Configuration
 * @param {import('./types').Piece} piece
 * @param {import('./types').Piece[]} offer
 * @param {import('./types').RequestOptions} [options]
 */
export async function aggregateOffer(
  { issuer, with: resource, proofs, audience },
  piece,
  offer,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const block = await CBOR.write(offer)
  const invocation = AggregateCapabilities.offer.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? servicePrincipal,
    with: resource,
    nb: {
      offer: block.cid,
      piece,
    },
    proofs,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}

/**
 * Get details of an aggregate.
 *
 * @param {import('./types').InvocationConfig} conf - Configuration
 * @param {import('@ucanto/interface').UnknownLink} subject
 * @param {import('./types').RequestOptions} [options]
 */
export async function aggregateGet(
  { issuer, with: resource, proofs, audience },
  subject,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  return await AggregateCapabilities.get
    .invoke({
      issuer,
      /* c8 ignore next */
      audience: audience ?? servicePrincipal,
      with: resource,
      nb: {
        subject,
      },
      proofs,
    })
    .execute(conn)
}
