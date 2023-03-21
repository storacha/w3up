/* eslint-disable unicorn/new-for-builtins, max-depth */
import * as Server from '@ucanto/server'
import { ed25519, Absentee } from '@ucanto/principal'
import { sha256 } from 'multiformats/hashes/sha2'
import { Access } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as Mailto from '../utils/did-mailto.js'
import { delegationToString } from '@web3-storage/access/encoding'
import * as Customer from './customer.js'
import * as Pin from '../utils/pin.js'

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

  // We will build a verification URL that we will send to the user in order
  // to request an authorization.
  const url = new URL(context.url)
  url.pathname = '/validate-email'

  // We want to limit the window in witch the user can approve the request
  // to limit the risk of unintended approval.
  const lifetimeInSeconds = 60 * 15 // 15 minutes

  // we generate a random 6 digit pin and a delegate keypair from the account
  // did and the pin. This will allow a an account holder to generate a delegate
  // keypair from the pin and allow them to approve the request with it.
  const pin = Pin.generate()

  // Delegate `access/authorize` to the session principal so it can be used
  // to approve the requested access. In the future we will only pass the
  // delegation along with the private key so that the user can decide which
  // capabilities to grant. For now we will also create an invocation so that
  // user can approve with a simple click.
  const authorization = await authorize({
    service: provider,
    account,
    agent: capability.with,
    access: capability.nb.access,
    pin,
    lifetimeInSeconds,
  })
  // encode the delegation as a query parameter and add it to the URL
  url.searchParams.set('ucan', await delegationToString(authorization))
  url.searchParams.set('pin', pin.join(''))
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
 * @param {number[]} input.pin
 * @param {Server.Signer<Server.API.DID<'web'>>} input.service
 * @param {Server.UCAN.Signer<Server.API.DID<'mailto'>>} input.account
 * @param {Server.API.DID} input.agent
 * @param {Capabilities.AccessRequest['nb']['access']} input.access
 * @param {number} input.lifetimeInSeconds
 */
export const authorize = async ({
  service,
  account,
  agent,
  access,
  pin,
  lifetimeInSeconds,
}) => {
  const delegate = await createSession({
    pin,
    account: account.did(),
  })

  // We delegate `access/authorize` capability to this delegate so that it can
  // approve requested access by invoking it.
  const authorization = await Access.authorize.delegate({
    issuer: account,
    audience: delegate,
    with: account.did(),
    lifetimeInSeconds,
  })

  // We also issue an for the above authorization to give a delegate a proof
  // needed to invoke above delegation.
  const attestation = await Access.session
    .invoke({
      issuer: service,
      audience: delegate,
      with: service.did(),
      nb: { proof: authorization.cid },
      lifetimeInSeconds,
    })
    .delegate()

  // In the future we could store above delegations using `access/delegate` and
  // send the delegate keypair to the user email which would allow them to
  // decide exactly what they want to grant presumably through the UI we will
  // build. For now however we will just create an invocation from the delegate
  // and send that to the user email allowing user to approve requested access
  // with a simple click.
  return await Access.authorize
    .invoke({
      issuer: delegate,
      audience: service,
      with: account.did(),
      nb: {
        agent,
        access,
      },
      lifetimeInSeconds,
      proofs: [authorization, attestation],
    })
    .delegate()
}

/**
 * We create a temporary delegate to represent an account during an
 * authorization session. We derive a keypair from the account and a random
 * 6 digit pin. We then delegate `access/authorize` capability to this delegate
 *
 * @param {object} input
 * @param {number[]} input.pin
 * @param {string} input.account
 */
const createSession = async ({ account, pin }) => {
  const seed = new TextEncoder().encode(JSON.stringify({ account, pin }))
  const secret = await sha256.digest(seed)
  return await ed25519.derive(secret.digest)
}
