import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as Capabilities from '@web3-storage/capabilities/types'
import { delegationsToString } from '@web3-storage/access/encoding'
import { Absentee, Verifier } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import * as API from '../types/index.js'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.ConsumerStore} models.consumers
 * @property {API.SubscriptionStore} models.subscriptions
 * @property {API.DelegationStore} models.delegations
 * @property {API.ValidationStore} models.validations
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {URL} url
 * @property {import('../bindings').Email} email
 */

/**
 * @param {object} input
 * @param {Capabilities.AccessAuthorize} input.capability
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.AccessAuthorizeSuccess, Capabilities.AccessAuthorizeFailure>>}
 */
export const authorize = async ({ capability }, context) => {
  const { account, agent, capabilities } = decodeAuthorization(capability)
  const proofs = await context.models.delegations.find({
    audience: account.did(),
  })

  // create a delegation on behalf of the account with an absent signature.
  const delegation = await delegate({
    issuer: account,
    audience: agent,
    capabilities,
    expiration: Infinity,
    // We include all the delegations to the account so that the agent will
    // have delegation chains to all the delegated resources.
    // We should actually filter out only delegations that support delegated
    // capabilities, but for now we just include all of them since we only
    // implement sudo access anyway.
    proofs,
  })

  const attestation = await Access.session.delegate({
    issuer: context.signer,
    audience: agent,
    with: context.signer.did(),
    nb: { proof: delegation.cid },
    expiration: Infinity,
  })

  // Store the delegations so that they can be pulled with access/claim
  // The fact that we're storing proofs chains that we pulled from the
  // database is not great, but it's a tradeoff we're making for now.
  await context.models.delegations.putMany(delegation, attestation)

  const authorization = delegationsToString([delegation, attestation])
  // Save delegations for the validation process
  await context.models.validations.putSession(authorization, agent.did())

  return {}
}

/**
 * @param {Capabilities.AccessAuthorize} capability
 */

export const decodeAuthorization = (capability) => {
  const { from, to, access } = capability.nb
  const account = Absentee.from({
    id: /** @type {Server.API.DID<'mailto'>} */ (from),
  })
  const agent = Verifier.parse(to)
  const capabilities = decodeAccess(access)

  return { account, agent, capabilities }
}

/**
 *
 * @param {Capabilities.AccessAuthorize['nb']['access']} access
 */
export const decodeAccess = (access) => {
  const capabilities = []
  for (const [uri, abilities] of Object.entries(access)) {
    for (const [ability, caveats] of Object.entries(abilities)) {
      const options = caveats.length === 0 ? [{}] : caveats
      for (const nb of options) {
        capabilities.push(
          /** @type {Server.API.Capability} */ ({ with: uri, can: ability, nb })
        )
      }
    }
  }

  return /** @type {Server.API.Capabilities} */ (capabilities)
}

/**
 * @param {import('../bindings').RouteContext} context
 */
export const provide = (context) =>
  Server.provide(Access.authorize, (input) => authorize(input, context))
