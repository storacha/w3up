import * as Server from '@ucanto/server'
import * as Offer from '@web3-storage/capabilities/offer'
import * as API from '../types.js'

/**
 * @param {API.OfferServiceContext} context
 * @returns {API.UcantoInterface.ServiceMethod<API.OfferArrange, API.OfferArrangeResponse, API.UcantoInterface.Failure>}
 */
export function offerArrangeProvider({ arrangedOfferStore }) {
  return Server.provide(Offer.arrange, async ({ capability }) => {
    const commitmentProof = capability.nb.commitmentProof

    const status = await arrangedOfferStore.get(commitmentProof)

    if (!status) {
      return {
        error: new Server.Failure(
          `provided commitment proof ${commitmentProof} has no arranged offers`
        ),
      }
    }

    return {
      ok: {
        status,
      },
    }
  })
}
