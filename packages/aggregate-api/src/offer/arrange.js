import * as Server from '@ucanto/server'
import * as Offer from '@web3-storage/capabilities/offer'
import * as API from '../types.js'

/**
 * @param {API.OfferServiceContext} context
 */
export const provide = (context) =>
  Server.provide(Offer.arrange, (input) => claim(input, context))

/**
 * @param {API.Input<Offer.arrange>} input
 * @param {API.OfferServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.OfferArrangeSuccess, API.OfferArrangeFailure>>}
 */
export const claim = async ({ capability }, { arrangedOfferStore }) => {
  const pieceLink = capability.nb.pieceLink

  const status = await arrangedOfferStore.get(pieceLink)

  if (!status) {
    return {
      error: new OfferArrangeNotFound(
        `arranged offer not found for piece: ${pieceLink}`
      ),
    }
  }

  return {
    ok: {
      status,
    },
  }
}

class OfferArrangeNotFound extends Server.Failure {
  get name() {
    return /** @type {const} */ ('OfferArrangeNotFound')
  }
}
