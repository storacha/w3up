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
 * The `filecoin/offer` task can be executed to request storing a content piece
 * in Filecoin. It issues a signed receipt of the execution result.
 *
 * A receipt for successful execution will contain an effect, linking to a
 * `filecoin/submit` task that will complete asynchronously.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinoffer
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
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}

/**
 * The `filecoin/submit` task is an _effect_ linked from successful execution
 * of a `filecoin/offer` task, it is executed to issue a receipt for the
 * success or failure of the task.
 *
 * A receipt for successful execution indicates that the offered piece has been
 * submitted to the pipeline. In this case the receipt will contain an effect,
 * linking to a `piece/offer` task that will complete asynchronously.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinsubmit
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
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}

/**
 * The `filecoin/accept` task is an _effect_ linked from successful execution
 * of a `filecoin/offer` task, it is executed to issue a receipt for the
 * success or failure of the task.
 *
 * A receipt for successful execution indicates that the offered piece has been
 * accepted in a Filecoin deal. In this case the receipt will contain proofs
 * that the piece was included in an aggregate and deal.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinaccept
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
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}

/**
 * The `filecoin/info` task can be executed to request info about a content piece
 * in Filecoin. It issues a signed receipt of the execution result.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('./types.js').RequestOptions<StorefrontService>} [options]
 */
export async function filecoinInfo(
  { issuer, with: resource, proofs, audience },
  piece,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = Storefront.filecoinInfo.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STOREFRONT.principal,
    with: resource,
    nb: {
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
