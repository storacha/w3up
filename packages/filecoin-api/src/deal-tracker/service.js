import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as DealTrackerCaps from '@web3-storage/capabilities/filecoin/deal-tracker'

// eslint-disable-next-line no-unused-vars
import * as API from '../types.js'
import { StoreOperationFailed } from '../errors.js'

/**
 * @typedef {import('@web3-storage/capabilities/types').DealDetails} DealDetails
 */

/**
 * @param {API.Input<DealTrackerCaps.dealInfo>} input
 * @param {import('./api.js').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealInfoSuccess, API.DealInfoFailure>>}
 */
export const dealInfo = async ({ capability }, context) => {
  const { piece } = capability.nb

  const records = []
  /** @type {string|undefined} */
  let cursor
  do {
    const storeQuery = await context.dealStore.query({ piece }, { cursor })
    if (storeQuery.error) {
      return { error: new StoreOperationFailed(storeQuery.error.message) }
    }

    records.push(...storeQuery.ok.results)
    cursor = storeQuery.ok.cursor
  } while (cursor)

  return {
    ok: {
      deals: records.reduce((acc, curr) => {
        acc[`${curr.dealId}`] = {
          provider: curr.provider,
        }

        return acc
      }, /** @type {Record<string, DealDetails>} */ ({})),
    },
  }
}

/**
 * @param {import('./api.js').ServiceContext} context
 */
export function createService(context) {
  return {
    deal: {
      info: Server.provide(DealTrackerCaps.dealInfo, (input) =>
        dealInfo(input, context)
      ),
    },
  }
}

/**
 * @param {API.UcantoServerContext & import('./api.js').ServiceContext} context
 */
export const createServer = (context) =>
  Server.create({
    id: context.id,
    codec: context.codec || CAR.inbound,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
    validateAuthorization: (auth) => context.validateAuthorization(auth),
  })

/**
 * @param {object} options
 * @param {API.UcantoInterface.Principal} options.id
 * @param {API.UcantoInterface.Transport.Channel<API.DealTrackerService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })
