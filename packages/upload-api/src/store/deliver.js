import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'
import { StoreItemNotFound, QueueOperationFailed } from './lib.js'

/**
 * @param {API.Input<Store.deliver>} input
 * @param {API.StoreServiceContext} context
 * @returns {Promise<API.Result<API.StoreDeliverSuccess, API.StoreDeliverFailure> | API.JoinBuilder<API.StoreDeliverSuccess>>}
 */
const accept = async ({ capability }, context) => {
  const { link } = capability.nb
  return Server.ok({ link })
}

/**
 * Handle invocation from client by checking that bytes were written, and queueing it for
 * self signing issue.
 *
 * @param {API.Input<Store.deliver>} input
 * @param {API.StoreServiceContext} context
 * @returns {Promise<API.Result<API.StoreDeliverSuccess, API.StoreDeliverFailure> | API.JoinBuilder<API.StoreDeliverSuccess>>}
 */
const enqueue = async ({ capability }, context) => {
  const { carStoreBucket } = context
  const { link } = capability.nb
  const space = Server.DID.parse(capability.with).did()

  const carExists = await carStoreBucket.has(link)
  if (!carExists) {
    return Server.error(new StoreItemNotFound(space, link))
  }

  // Create effect for receipt for self-signed store/deliver from service
  const [acceptfx] = await Promise.all([
    Store.deliver
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

  // Queue `store/deliver` self invocation
  const res = await context.storeDeliverQueue.add({
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
 * @param {API.Input<Store.deliver>} input
 * @param {API.StoreServiceContext} context
 * @returns {Promise<API.Result<API.StoreDeliverSuccess, API.StoreDeliverFailure> | API.JoinBuilder<API.StoreDeliverSuccess>>}
 */
export const storeDeliver = async (input, context) => {
  // If self issued we accept without verification
  return context.signer.did() === input.capability.with
    ? accept(input, context)
    : enqueue(input, context)
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
