import * as StorefrontCapabilities from '@web3-storage/capabilities/filecoin/storefront'
import * as Server from '@ucanto/server'

/**
 * @param {Server.Signer<`did:${string}:${string}`, Server.API.SigAlg>} id
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {Pick<{ content: Server.API.Link<unknown, number, number, 0 | 1>; piece: import('@web3-storage/data-segment').PieceLink; }, 'content' | 'piece'>} args
 */
export async function getFilecoinOfferResponse(id, piece, args) {
  // Create effect for receipt with self signed queued operation
  const submitfx = await StorefrontCapabilities.filecoinSubmit
    .invoke({
      issuer: id,
      audience: id,
      with: id.did(),
      nb: args,
      expiration: Infinity,
    })
    .delegate()

  const acceptfx = await StorefrontCapabilities.filecoinAccept
    .invoke({
      issuer: id,
      audience: id,
      with: id.did(),
      nb: args,
      expiration: Infinity,
    })
    .delegate()

  return Server.ok({ piece }).fork(submitfx.link()).join(acceptfx.link())
}
