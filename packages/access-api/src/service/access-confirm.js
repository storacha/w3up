import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { Absentee, Verifier } from '@ucanto/principal'
import { collect } from 'streaming-iterables'
import * as Access from '@web3-storage/capabilities/access'
import { delegationsToString } from '@web3-storage/access/encoding'
import * as delegationsResponse from '../utils/delegations-response.js'

/**
 * @typedef {import('@web3-storage/capabilities/types').AccessConfirmSuccess} AccessConfirmSuccess
 * @typedef {import('@web3-storage/capabilities/types').AccessConfirmFailure} AccessConfirmFailure
 */

/**
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/src/types').AccessConfirm>} invocation
 */
export function parse(invocation) {
  const capability = invocation.capabilities[0]
  // Create a absentee signer for the account that authorized the delegation
  const account = Absentee.from({ id: capability.nb.iss })
  const agent = Verifier.parse(capability.nb.aud)
  return {
    account,
    agent,
  }
}

/**
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/src/types').AccessConfirm>} invocation
 * @param {import('../bindings').RouteContext} ctx
 * @returns {Promise<Ucanto.Result<AccessConfirmSuccess, AccessConfirmFailure>>}
 */
export async function handleAccessConfirm(invocation, ctx) {
  const capability = invocation.capabilities[0]
  if (capability.with !== ctx.signer.did()) {
    throw new Error(`Not a valid access/confirm delegation`)
  }

  const { account, agent } = parse(invocation)

  // It the future we should instead render a page and allow a user to select
  // which delegations they wish to re-delegate. Right now we just re-delegate
  // everything that was requested for all of the resources.
  const capabilities =
    /** @type {ucanto.UCAN.Capabilities} */
    (
      capability.nb.att.map(({ can }) => ({
        can,
        with: /** @type {ucanto.UCAN.Resource} */ ('ucan:*'),
      }))
    )

  const [delegation, attestation] = await createSessionProofs({
    service: ctx.signer,
    account,
    agent,
    capabilities,
    // We include all the delegations to the account so that the agent will
    // have delegation chains to all the delegated resources.
    // We should actually filter out only delegations that support delegated
    // capabilities, but for now we just include all of them since we only
    // implement sudo access anyway.
    delegationProofs: ctx.models.delegations.find({
      audience: account.did(),
    }),
    expiration: Infinity,
  })

  // Store the delegations so that they can be pulled with access/claim
  // The fact that we're storing proofs chains that we pulled from the
  // database is not great, but it's a tradeoff we're making for now.
  await ctx.models.delegations.putMany(delegation, attestation)

  const authorization = delegationsToString([delegation, attestation])
  // Save delegations for the validation process
  await ctx.models.validations.putSession(authorization, agent.did())

  return {
    delegations: delegationsResponse.encode([delegation, attestation]),
  }
}

/**
 * @param {object} opts
 * @param {Ucanto.Signer} opts.service
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} opts.account
 * @param {Ucanto.Principal<Ucanto.DID>} opts.agent
 * @param {Ucanto.Capabilities} opts.capabilities
 * @param {AsyncIterable<Ucanto.Delegation>} opts.delegationProofs
 * @param {number} opts.expiration
 * @returns {Promise<[delegation: Ucanto.Delegation, attestation: Ucanto.Delegation]>}
 */
export async function createSessionProofs({
  service,
  account,
  agent,
  capabilities,
  delegationProofs,
  // default to Infinity is reasonable here because
  // account consented to this.
  expiration = Infinity,
}) {
  // create an delegation on behalf of the account with an absent signature.
  const delegation = await ucanto.delegate({
    issuer: Absentee.from({ id: account.did() }),
    audience: agent,
    capabilities,
    expiration,
    proofs: [...(await collect(delegationProofs))],
  })

  const attestation = await Access.session.delegate({
    issuer: service,
    audience: agent,
    with: service.did(),
    nb: { proof: delegation.cid },
    expiration,
  })

  return [delegation, attestation]
}
