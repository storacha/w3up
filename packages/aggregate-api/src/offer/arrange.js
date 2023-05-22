import * as Server from '@ucanto/server'
import * as Offer from '@web3-storage/capabilities/offer'
import * as API from '../types.js'

/**
 * @param {API.OfferServiceContext} context
 * @returns {API.UcantoInterface.ServiceMethod<API.OfferArrange, {}, API.UcantoInterface.Failure>}
 */
export function offerArrangeProvider({}) {
  return Server.provide(Offer.arrange, async ({ capability, invocation }) => {
    throw new Error('not yet implemented')
  })
}
