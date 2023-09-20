import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as Storefront from '@web3-storage/capabilities/filecoin/storefront'
import { services } from './service.js'

/**
 * @typedef {import('./types.js').StorefrontService} StorefrontService
 * @typedef {import('@ucanto/interface').ConnectionView<StorefrontService>} ConnectionView
 */

/** @type {ConnectionView} */
export const connection = connect({
  id: services.STOREFRONT.principal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: services.STOREFRONT.url,
    method: 'POST',
  }),
})

/**
 * Request storing a content piece in Filecoin.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('multiformats').UnknownLink} content
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions<StorefrontService>} [options]
 */
export async function filecoinOffer(
  { issuer, with: resource, proofs, audience },
  content,
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Storefront.filecoinOffer.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STOREFRONT.principal,
    with: resource,
    nb: {
      content,
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}

/**
 * Signal that an offered piece has been submitted to the filecoin storage
 * pipeline.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('multiformats').UnknownLink} content
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions<StorefrontService>} [options]
 */
export async function filecoinSubmit(
  { issuer, with: resource, proofs, audience },
  content,
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Storefront.filecoinSubmit.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STOREFRONT.principal,
    with: resource,
    nb: {
      content,
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}

/**
 * Signal that a submitted piece has been accepted in a Filecoin deal.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('multiformats').UnknownLink} content
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions<StorefrontService>} [options]
 */
export async function filecoinAccept(
  { issuer, with: resource, proofs, audience },
  content,
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Storefront.filecoinAccept.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STOREFRONT.principal,
    with: resource,
    nb: {
      content,
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
