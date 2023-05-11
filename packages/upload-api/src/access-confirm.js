import * as Types from './types.js'
import * as Provider from '@ucanto/server'
import { Absentee, Verifier } from '@ucanto/principal'
import { collect } from 'streaming-iterables'
import * as Access from '@web3-storage/capabilities/access'
import * as delegationsResponse from './utils/delegations-response.js'

/**
 * @param {Types.AccessConfirm} capability
 */
export function parse(capability) {
  // Create a absentee signer for the account that authorized the delegation
  const account = Absentee.from({ id: capability.nb.iss })
  const agent = Verifier.parse(capability.nb.aud)
  return {
    account,
    agent,
  }
}

/**
 *
 * @param {Types.AccessServiceContext} ctx
 */
export const provide = (ctx) =>
  Provider.provide(Access.confirm, (input) => confirm(input, ctx))

/**
 * @param {Types.Input<Access.confirm>} input
 * @param {Types.AccessServiceContext} ctx
 * @returns {Promise<Types.Result<Types.AccessConfirmSuccess, Types.AccessConfirmFailure>>}
 */
export async function confirm({ capability, invocation }, ctx) {
  if (capability.with !== ctx.signer.did()) {
    throw new Error(`Not a valid access/confirm delegation`)
  }

  const { account, agent } = parse(capability)

  // It the future we should instead render a page and allow a user to select
  // which delegations they wish to re-delegate. Right now we just re-delegate
  // everything that was requested for all of the resources.
  const capabilities =
    /** @type {Types.UCAN.Capabilities} */
    (
      capability.nb.att.map(({ can }) => ({
        can,
        with: /** @type {Types.UCAN.Resource} */ ('ucan:*'),
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
    delegationProofs: ctx.delegationsStorage.find({
      audience: account.did(),
    }),
    expiration: Infinity,
  })

  // Store the delegations so that they can be pulled with access/claim
  // The fact that we're storing proofs chains that we pulled from the
  // database is not great, but it's a tradeoff we're making for now.
  await ctx.delegationsStorage.putMany(delegation, attestation)

  return {
    ok: {
      delegations: delegationsResponse.encode([delegation, attestation]),
    },
  }
}

/**
 * @param {object} opts
 * @param {Types.Signer} opts.service
 * @param {Types.Principal<Types.DID<'mailto'>>} opts.account
 * @param {Types.Principal<Types.DID>} opts.agent
 * @param {Types.Capabilities} opts.capabilities
 * @param {AsyncIterable<Types.Delegation>} opts.delegationProofs
 * @param {number} opts.expiration
 * @returns {Promise<[delegation: Types.Delegation, attestation: Types.Delegation]>}
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
  const delegation = await Provider.delegate({
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
