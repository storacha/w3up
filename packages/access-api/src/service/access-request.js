/* eslint-disable unicorn/new-for-builtins, max-depth */
import * as Server from '@ucanto/server'
import { ed25519, Absentee } from '@ucanto/principal'
import { Access, Consumer } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as Mailto from '../utils/did-mailto.js'
import { delegationToString } from '@web3-storage/access/encoding'
import { codec as CBOR } from '@ucanto/transport/cbor'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/consumers').ConsumerStore} models.consumers
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {URL} url
 * @property {import('../bindings').Email} email
 *
 * @param {object} input
 * @param {Capabilities.AccessRequest} input.capability
 * @param {Context} context
 * @returns {Promise<Capabilities.AccessRequestSuccess>}
 */
export const request = async ({ capability }, context) => {
  const provider = context.signer
  const account = Absentee.from({ id: capability.nb.from })

  // We want to check if we already have a consumer record for this provider
  // and account. We do not await here though as we have few more async steps
  // to do before we need the result.
  const consumersPromise = context.models.consumers.find({
    provider: provider.did(),
    customer: account.did(),
  })

  // Generate a new "session" principal for the user that can be used to
  // by the account holder to approve requested access.
  const sessionPrincipal = await ed25519.generate()

  // We will build a verification URL that we will send to the user in order
  // to request an authorization.
  const url = new URL(context.url)
  url.pathname = '/validate-email'

  // We want to limit the window in witch the user can approve the request
  // to limit the risk of unintended approval.
  const lifetimeInSeconds = 60 * 15 // 15 minutes
  // Delegate `access/authorize` to the session principal so it can be used
  // to approve the requested access. In the future we will only pass the
  // delegation along with the private key so that the user can decide which
  // capabilities to grant. For now we will also create an invocation so that
  // user can approve with a simple click.
  const authorization = await authorize({
    service: provider,
    agent: sessionPrincipal,
    from: account.did(),
    to: capability.with,
    access: capability.nb.access,
    lifetimeInSeconds,
  })
  // encode the delegation as a query parameter and add it to the URL
  url.searchParams.set('approve', await delegationToString(authorization))

  // If don't have a consumer record for this provider and account, we delegate
  // `consumer/add` capability to the session principal so that it can provision
  // a space. In the future we will only pass the delegation along with the
  // private key so that user could choose which space DID to use. For now we
  // also create an invocation that will provision a session principal as a
  // space.
  const consumers = await consumersPromise
  if (consumers.length === 0) {
  }

  if (consumers.length === 0) {
    const enrollment = await enroll({
      provider,
      customer: account,
      agent: sessionPrincipal,
      lifetimeInSeconds,
    })

    url.searchParams.set('enroll', await delegationToString(enrollment))
  }

  await context.email.sendValidation({
    to: Mailto.toEmail(account.did()),
    url: url.toString(),
  })

  return {}
}

/**
 * @param {import('../bindings').RouteContext} context
 */
export const provide = (context) =>
  Server.provide(Access.request, (input) => request(input, context))

/**
 * @param {object} input
 * @param {Server.Signer<Server.API.DID<'key'>>} input.agent
 * @param {Server.Signer<Server.API.DID<'web'>>} input.provider
 * @param {Server.Principal<Server.API.DID<'mailto'>>} input.customer
 * @param {number} input.lifetimeInSeconds
 */
export const enroll = async ({ provider, customer, agent }) => {
  const order = await CBOR.write({ customer })
  const delegation = await Consumer.add.delegate({
    issuer: provider,
    audience: agent,
    with: provider.did(),
    nb: {
      // we should probably store subscription info in a separate table
      // and reference that record by ID here. For now we keep things simple
      // and pass the subscription info as is.
      order: order.cid,
      customer: customer.did(),
    },
  })

  const invocation = Consumer.add.invoke({
    issuer: agent,
    audience: provider,
    with: provider.did(),
    nb: {
      order: order.cid,
      consumer: agent.did(),
      customer: customer.did(),
    },
    proofs: [delegation],
  })

  return await invocation.delegate()
}

/**
 * @param {object} input
 * @param {Server.Signer<Server.API.DID<'web'>>} input.service
 * @param {Server.API.DID<'mailto'>} input.from
 * @param {Server.API.DID} input.to
 * @param {Server.Signer} input.agent
 * @param {Capabilities.AccessRequest['nb']['access']} input.access
 * @param {number} input.lifetimeInSeconds
 */
export const authorize = async ({
  service,
  from,
  to,
  agent,
  access,
  lifetimeInSeconds,
}) => {
  // Delegate authorization to the temporary agent so it could invoke it.
  const delegation = await Access.authorize.delegate({
    issuer: service,
    audience: agent,
    with: service.did(),
    nb: {
      from,
      to,
      access,
    },
    lifetimeInSeconds,
  })

  // In the future we should send the delegation to the agent and let it do
  // the invocation. Right now we do create invocation as well so that we
  // can create a simple link that user can click.
  const invocation = Access.authorize.invoke({
    issuer: agent,
    audience: service,
    with: service.did(),
    nb: {
      from,
      to,
      access,
    },
    expiration: delegation.expiration,
    proofs: [delegation],
  })

  return await invocation.delegate()
}
