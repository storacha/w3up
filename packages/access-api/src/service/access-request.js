/* eslint-disable unicorn/new-for-builtins, max-depth */
import * as Server from '@ucanto/server'
import { ed25519, Absentee } from '@ucanto/principal'
import { Access } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as Mailto from '../utils/did-mailto.js'
import { delegationToString } from '@web3-storage/access/encoding'
import * as Customer from './customer.js'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/consumers').ConsumerStore} models.consumers
 * @property {import('../types/subscriptions').SubscriptionStore} models.subscriptions
 * @property {import('../types/delegations').DelegationStore} models.delegations
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {URL} url
 * @property {import('../bindings').Email} email
 *
 * @param {object} input
 * @param {Capabilities.AccessRequest} input.capability
 * @param {{ cid: Capabilities.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.AccessRequestSuccess, Capabilities.AccessRequestFailure>>}
 */
export const request = async ({ capability, invocation }, context) => {
  const provider = context.signer
  const account = Absentee.from({ id: capability.nb.from })
  const customer = await Customer.createCustomer({
    provider,
    customer: account,
  })

  // We try to add the customer subscription to the provider, if one already
  // exists this will be a noop. If it did not exist one will be created and
  // `consumer/*` capability will be delegated to the account.
  const result = await Customer.add(customer, context)
  // This should never happen because adding same subscription twice is a noop
  // yet we check and propagate error just in case.
  if (result.error) {
    return result
  }

  // Generate a new "session" principal for the user that can be used to
  // by the account holder to approve or deny requested authorization.
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
  url.searchParams.set('ucan', await delegationToString(authorization))
  url.searchParams.set('mode', 'authorize')

  await context.email.sendValidation({
    to: Mailto.toEmail(account.did()),
    url: url.toString(),
  })

  return { ran: invocation.cid }
}

/**
 * @param {Context} context
 */
export const provide = (context) =>
  Server.provide(Access.request, (input) => request(input, context))

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
