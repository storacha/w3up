import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { services } from './service.js'

/**
 * @typedef {import('@ucanto/interface').ConnectionView<import('./types.js').StorefrontService>} ConnectionView
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
 * Add a piece to the filecoin pipeline.
 *
 * @param {import('./types.js').InvocationConfig} conf - Configuration
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {import('multiformats').UnknownLink} content
 * @param {import('./types.js').RequestOptions} [options]
 */
export async function filecoinAdd(
  { issuer, with: resource, proofs, audience },
  piece,
  content,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const invocation = FilecoinCapabilities.filecoinAdd.invoke({
    issuer,
    /* c8 ignore next */
    audience: audience ?? services.STOREFRONT.principal,
    with: resource,
    nb: {
      content: content,
      piece,
    },
    proofs,
  })

  return await invocation.execute(conn)
}
