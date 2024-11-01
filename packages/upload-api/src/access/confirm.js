import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Absentee, Verifier } from '@ucanto/principal'
import * as Access from '@storacha/capabilities/access'
import * as UCAN from '@storacha/capabilities/ucan'
import * as delegationsResponse from '../utils/delegations-response.js'

/**
 * @param {API.AccessConfirm} capability
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
 * @param {API.AccessServiceContext} ctx
 */
export const provide = (ctx) =>
  Provider.provide(Access.confirm, (input) => confirm(input, ctx))

/**
 * @param {API.Input<Access.confirm>} input
 * @param {API.AccessServiceContext} ctx
 * @returns {Promise<API.Result<API.AccessConfirmSuccess, API.AccessConfirmFailure>>}
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
    /** @type {API.UCAN.Capabilities} */
    (
      capability.nb.att.map(({ can }) => ({
        can,
        with: /** @type {API.UCAN.Resource} */ ('ucan:*'),
      }))
    )

  const delegationsResult = await ctx.delegationsStorage.find({
    audience: account.did(),
  })

  if (delegationsResult.error) {
    return delegationsResult
  }

  // Create session proofs, but containing no Space proofs. We'll store these,
  // and generate the Space proofs on access/claim.
  const [delegation, attestation] = await createSessionProofs({
    service: ctx.signer,
    account,
    agent,
    // facts are used by the client to find delegations that were created
    // for the invoked `access/authorize` request.
    facts: [
      {
        // link to the `access/authorize` invocation that requested access
        'access/request': capability.nb.cause,
        // link to the `access/confirm` invocation that approved access
        'access/confirm': invocation.cid,
      },
    ],
    capabilities,
    delegationProofs: [],
    expiration: Infinity,
  })

  // Store the delegations so that they can be pulled during access/claim.
  // Since there is no invocation that contains these delegations, don't pass
  // a `cause` parameter.
  // TODO: we should invoke access/delegate here rather than interacting with
  // the delegations storage system directly.
  await ctx.delegationsStorage.putMany([delegation, attestation])

  return {
    ok: {
      delegations: delegationsResponse.encode([delegation, attestation]),
    },
  }
}

/**
 * @param {object} opts
 * @param {API.Signer} opts.service
 * @param {API.Principal<API.DID<'mailto'>>} opts.account
 * @param {API.Principal<API.DID>} opts.agent
 * @param {API.Fact[]} opts.facts
 * @param {API.Capabilities} opts.capabilities
 * @param {API.Delegation[]} opts.delegationProofs
 * @param {number} opts.expiration
 * @returns {Promise<[delegation: API.Delegation, attestation: API.Delegation]>}
 */
export async function createSessionProofs({
  service,
  account,
  agent,
  facts,
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
    proofs: delegationProofs,
    facts,
  })

  const attestation = await UCAN.attest.delegate({
    issuer: service,
    audience: agent,
    with: service.did(),
    nb: { proof: delegation.cid },
    expiration,
    facts,
  })

  return [delegation, attestation]
}
