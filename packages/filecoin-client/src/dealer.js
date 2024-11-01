import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { CBOR } from '@ucanto/core'
import * as Dealer from '@storacha/capabilities/filecoin/dealer'
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
 * The `aggregate/offer` task can be executed to request an aggregate be added
 * to a deal with a Storage Provider. It issues a signed receipt of the
 * execution result. It is _also_ an effect linked from successful execution of
 * a `piece/accept` task.
 *
 * A receipt for successful execution will contain an effect, linking to an
 * `aggregate/accept` task that will complete asynchronously.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#aggregateoffer
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
    expiration: Infinity,
  })
  invocation.attach(block)

  return await invocation.execute(conn)
}

/**
 * The `aggregate/accept` task is an _effect_ linked from successful execution
 * of a `aggregate/offer` task, it is executed to issue a receipt for the
 * success or failure of the task.
 *
 * A receipt for successful execution indicates that an aggregate has been
 * accepted for inclusion in a Filecoin deal. In this case the receipt will
 * contain proofs that the piece was included in an aggregate and deal.
 *
 * Otherwise the task is failed and the receipt will contain details of the
 * reason behind the failure, as well as multiple effects, linking to
 * `piece/offer` tasks that will retry _valid_ pieces and complete
 * asynchronously.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-filecoin.md#aggregateaccept
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} aggregate
 * @param {import('@ucanto/interface').Link} pieces
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
  const invocation = Dealer.aggregateAccept.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.AGGREGATOR.principal,
    with: resource,
    nb: {
      aggregate,
      pieces,
    },
    proofs,
    expiration: Infinity,
  })

  return await invocation.execute(conn)
}
