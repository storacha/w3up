import * as Server from '@ucanto/server'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as API from '../types/index.js'
import { Provision } from '@web3-storage/capabilities'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.ConsumerStore} models.consumers
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {object} config
 * @property {string} config.ENV
 *
 * @param {object} input
 * @param {Capabilities.ProvisionAdd} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ProvisionAddSuccess, Capabilities.ProvisionAddFailure>>}
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
 * @param {Capabilities.ProvisionRemove} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ProvisionRemoveSuccess, Capabilities.ProvisionRemoveFailure>>}
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
 * @param {Capabilities.ProvisionList} input.capability
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ProvisionListSuccess, Capabilities.ProvisionListFailure>>}
 */
export const list = async ({ capability }, context) => {
  const {
    with: provider,
    nb: { order },
  } = capability

  // disable until hardened in test/staging
  if (context.config.ENV === 'production') {
    throw new Error(`provider/add invocation handling is not enabled`)
  }

  // Then we add a consumer to subscription for the account
  return await context.models.consumers.find({
    provider,
    order,
  })
}

/**
 * Create an authorization for the given customer that allows them to add/remove
 * consumers to the subscription.
 *
 *
 * @param {object} input
 * @param {Server.API.Link} input.order
 * @param {Server.Signer<Server.API.DID<'web'>>} input.provider
 * @param {Server.Principal<Server.API.DID<"mailto">>} input.customer
 */
export const createProvision = async ({ provider, customer, order }) => {
  // We want to give account full access to the provider subscription so we
  // delegate `consumer/*` capability to it.
  return await Provision.provision
    .invoke({
      issuer: provider,
      expiration: Infinity,
      audience: customer,
      with: provider.did(),
      nb: {
        customer: customer.did(),
        order,
      },
    })
    .delegate()
}

/**
 * @param {Context} context
 */
export const provide = (context) => ({
  add: Server.provide(Provision.add, async (input) => add(input, context)),
  remove: Server.provide(Provision.remove, async (input) =>
    remove(input, context)
  ),
  list: Server.provide(Provision.list, async (input) => list(input, context)),
})
