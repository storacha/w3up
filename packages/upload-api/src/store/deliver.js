import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'
import { StoreItemNotFound, QueueOperationFailed } from './lib.js'

/**
 * Handle invocation from client by checking that bytes were written, and queueing it for `store/confirm`.
 *
 * @param {API.Input<Store.deliver>} input
 * @param {API.StoreServiceContext} context
 * @returns {Promise<API.Result<API.StoreDeliverSuccess, API.StoreDeliverFailure> | API.JoinBuilder<API.StoreDeliverSuccess>>}
 */
export const storeDeliver = async ({ capability }, context) => {
  const { carStoreBucket } = context
  const { link } = capability.nb
  const space = Server.DID.parse(capability.with).did()

  const carExists = await carStoreBucket.has(link)
  if (!carExists) {
    return Server.error(new StoreItemNotFound(space, link))
  }

  // Create effect for receipt for self-signed store/confirm from service
  const [acceptfx] = await Promise.all([
    Store.confirm
      .invoke({
        issuer: context.signer,
        audience: context.signer,
        with: context.signer.toDIDKey(),
        nb: {
          link
        },
        expiration: Infinity,
      })
      .delegate(),
  ])
  // TODO: Once we implement invocation spec, we should also have fork task CID for `store/deliver` from agent

  // Queue `store/confirm` self invocation
  const res = await context.storeConfirmQueue.add({
    link
  })
  if (res.error) {
    return {
      error: new QueueOperationFailed(res.error.message),
    }
  }
  
  /** @type {API.OkBuilder<API.StoreDeliverSuccess, API.StoreDeliverFailure>} */
  const result = Server.ok({ link })
  return result.join(acceptfx.link())
}

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreDeliver, API.StoreDeliverSuccess, API.StoreDeliverFailure>}
 */
export function storeDeliverProvider(context) {
  return Server.provideAdvanced({
    capability: Store.deliver,
    handler: (input) => storeDeliver(input, context)
  })
}
