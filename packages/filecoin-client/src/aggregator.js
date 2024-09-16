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
 * The `piece/offer` task can be executed to request that a piece be aggregated
 * for inclusion in an upcoming an Filecoin deal. It issues a signed receipt
 * of the execution result. It is _also_ an effect linked from successful
 * execution of a `filecoin/submit` task.
 *
 * A receipt for successful execution will contain an effect, linking to a
 * `piece/accept` task that will complete asynchronously.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#pieceoffer
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
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}

/**
 * The `piece/accept` task is an _effect_ linked from successful execution of a
 * `piece/offer` task, it is executed to issue a receipt for the success or
 * failure of the task.
 *
 * A receipt for successful execution indicates that the offered piece was
 * included in an aggregate. In this case the receipt will contain the
 * aggregate piece CID and a proof that the piece was included in the
 * aggregate. It also includes an effect, linking to an `aggregate/offer` task
 * that will complete asynchronously.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#pieceaccept
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
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}
