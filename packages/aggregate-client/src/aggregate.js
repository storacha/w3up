import * as AggregateCapabilities from '@web3-storage/capabilities/aggregate'
import { CBOR } from '@ucanto/core'

import { servicePrincipal, connection } from './service.js'

export const MIN_SIZE = 1 + 127 * (1 << 27)
export const MAX_SIZE = 127 * (1 << 28)

/**
 * Offer an aggregate to be assembled and stored.
 *
 * @param {import('./types').InvocationConfig} conf - Configuration
 * @param {import('./types').Offer[]} offers
 * @param {import('./types').RequestOptions} [options]
 */
export async function aggregateOffer(
  { issuer, with: resource, proofs, audience },
  offers,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  // TODO: Get commitmentProof
  const commitmentProof = 'commitmentProof'

  // Validate size for offer is valid
  const size = offers.reduce((accum, offer) => accum + offer.size, 0)
  if (size < MIN_SIZE) {
    throw new Error(
      `provided size is not enough to create an offer (${size} < ${MIN_SIZE})`
    )
  } else if (size > MAX_SIZE) {
    throw new Error(
      `provided size is larger than it can be accepted for an offer (${size} > ${MAX_SIZE})`
    )
  }

  // Validate valid URLs
  for (const offer of offers.values()) {
    for (const u of offer.src) {
      try {
        new URL(u)
      } catch {
        throw new Error(
          `provided url ${u} for offer CAR ${offer.link.toString()} is invalid`
        )
      }
    }
  }

  const block = await CBOR.write(offers)
  const invocation = AggregateCapabilities.offer.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? servicePrincipal,
    with: resource,
    nb: {
      offer: block.cid,
      commitmentProof,
      size,
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
 * @param {string} commitmentProof
 * @param {import('./types').RequestOptions} [options]
 */
export async function aggregateGet(
  { issuer, with: resource, proofs, audience },
  commitmentProof,
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
        commitmentProof: commitmentProof,
      },
      proofs,
    })
    .execute(conn)
}
