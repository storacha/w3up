import * as Server from '@ucanto/server'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as API from '../types/index.js'
import { Consumer } from '@web3-storage/capabilities'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.ConsumerStore} models.consumers
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {object} config
 * @property {string} config.ENV
 *
 * @param {object} input
 * @param {Capabilities.ConsumerAdd} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ConsumerAddSuccess, Capabilities.ConsumerAddFailure>>}
 */
export const add = async ({ capability, invocation }, context) => {
  const {
    with: provider,
    nb: { consumer, order },
  } = capability

  // disable until hardened in test/staging
  if (context.config.ENV === 'production') {
    throw new Error(`provider/add invocation handling is not enabled`)
  }

  // At the moment, we only support DID corresponding to our own DID.
  if (provider !== context.signer.did()) {
    return new Server.Failure(
      `Expected provider to be '${context.signer.did()}' but got '${provider}' instead`
    )
  }

  // Then we add a consumer to subscription for the account
  return await context.models.consumers.add({
    cause: invocation.cid,
    consumer,
    provider,
    order,
  })
}

/**
 * @param {object} input
 * @param {Capabilities.ConsumerRemove} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ConsumerRemoveSuccess, Capabilities.ConsumerRemoveFailure>>}
 */
export const remove = async ({ capability, invocation }, context) => {
  const {
    with: provider,
    nb: { consumer, order },
  } = capability

  // disable until hardened in test/staging
  if (context.config.ENV === 'production') {
    throw new Error(`provider/add invocation handling is not enabled`)
  }

  // At the moment, we only support DID corresponding to our own DID.
  if (provider !== context.signer.did()) {
    return new Server.Failure(
      `Expected provider to be '${context.signer.did()}' but got '${provider}' instead`
    )
  }

  // Then we add a consumer to subscription for the account
  return await context.models.consumers.add({
    cause: invocation.cid,
    consumer,
    provider,
    order,
  })
}

/**
 * @param {object} input
 * @param {Capabilities.ConsumerList} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ConsumerListSuccess, Capabilities.ConsumerListFailure>>}
 */
export const list = async ({ capability, invocation }, context) => {
  const {
    with: provider,
    nb: { order },
  } = capability

  // disable until hardened in test/staging
  if (context.config.ENV === 'production') {
    throw new Error(`provider/add invocation handling is not enabled`)
  }

  // At the moment, we only support DID corresponding to our own DID.
  if (provider !== context.signer.did()) {
    return new Server.Failure(
      `Expected provider to be '${context.signer.did()}' but got '${provider}' instead`
    )
  }

  // Then we add a consumer to subscription for the account
  return await context.models.consumers.find({
    provider,
    order: order?.toString(),
  })
}

/**
 * @param {Context} context
 */
export const provide = (context) => ({
  add: Server.provide(Consumer.add, async (input) => add(input, context)),
  remove: Server.provide(Consumer.remove, async (input) =>
    remove(input, context)
  ),
  list: Server.provide(Consumer.list, async (input) => list(input, context)),
})
