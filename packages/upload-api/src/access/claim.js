import * as Server from '@ucanto/server'
import * as Access from '@storacha/capabilities/access'
import * as UCAN from '@ipld/dag-ucan'
import * as API from '../types.js'
import * as delegationsResponse from '../utils/delegations-response.js'
import { createSessionProofs } from './confirm.js'

/**
 * @param {API.AccessClaimContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(Access.claim, (input) => claim(input, ctx))

/**
 * Checks if the given Principal is an Account.
 *
 * @param {API.Principal} principal
 * @returns {principal is API.Principal<API.DID<'mailto'>>}
 */
const isAccount = (principal) => principal.did().startsWith('did:mailto:')

/**
 * Returns true when the delegation has a `ucan:*` capability.
 *
 * @param {API.Delegation} delegation
 * @returns boolean
 */
const isUCANStar = (delegation) =>
  delegation.capabilities.some((capability) => capability.with === 'ucan:*')

/**
 * Returns true when the capability is a `ucan/attest` capability for the given
 * signer.
 *
 * @param {API.Capability} capability
 * @returns {capability is API.UCANAttest}
 */
const isUCANAttest = (capability) => capability.can === 'ucan/attest'

/**
 * @param {API.Input<Access.claim>} input
 * @param {API.AccessClaimContext} ctx
 * @returns {Promise<API.Result<API.AccessClaimSuccess, API.AccessClaimFailure>>}
 */
export const claim = async ({ invocation }, { delegationsStorage, signer }) => {
  const claimedAudience = invocation.capabilities[0].with
  const storedDelegationsResult = await delegationsStorage.find({
    audience: claimedAudience,
  })

  if (storedDelegationsResult.error) {
    return {
      error: {
        name: 'AccessClaimFailure',
        message: 'error finding delegations',
        cause: storedDelegationsResult.error,
      },
    }
  }

  const delegationsToReturnByCid = Object.fromEntries(
    storedDelegationsResult.ok.map((delegation) => [delegation.cid, delegation])
  )

  // Find any attested ucan:* delegations and replace them with fresh ones.
  for (const delegation of storedDelegationsResult.ok) {
    // Ignore delegations that aren't attestations, and ours.
    const attestCap = delegation.capabilities.find(isUCANAttest)
    if (!(attestCap && attestCap.with === signer.did())) continue

    // Ignore invalid attestations.
    const valid =
      (await UCAN.verifySignature(delegation.data, signer)) &&
      !UCAN.isTooEarly(delegation.data) &&
      !UCAN.isExpired(delegation.data)
    if (!valid) continue

    // Ignore attestations of delegations we don't have.
    const attestedCid = attestCap.nb.proof
    const attestedDelegation = delegationsToReturnByCid[attestedCid.toString()]
    if (!(attestedDelegation && isUCANStar(attestedDelegation))) continue

    // Create new session proofs for the attested delegation.
    const sessionProofsResult = await createSessionProofsForLogin(
      attestedDelegation,
      delegationsStorage,
      signer
    )

    // If something went wrong, bail on the entire invocation with the error.
    // NB: This breaks out of the loop, because if this fails at all, we don't
    // need to keep looking.
    if (sessionProofsResult.error) {
      return {
        error: {
          name: 'AccessClaimFailure',
          message: 'error creating session proofs',
          cause: sessionProofsResult.error,
        },
      }
    }

    // Delete the ones we're replacing...
    delete delegationsToReturnByCid[delegation.cid.toString()]
    delete delegationsToReturnByCid[attestedCid.toString()]

    // ...and add the new ones.
    for (const proof of sessionProofsResult.ok) {
      delegationsToReturnByCid[proof.cid.toString()] = proof
    }
  }

  return {
    ok: {
      delegations: delegationsResponse.encode(
        Object.values(delegationsToReturnByCid)
      ),
    },
  }
}

/**
 * @param {API.Delegation} loginDelegation
 * @param {API.DelegationsStorage} delegationsStorage
 * @param {API.Signer} signer
 * @returns {Promise<API.Result<API.Delegation[], API.AccessClaimFailure>>}
 */
async function createSessionProofsForLogin(
  loginDelegation,
  delegationsStorage,
  signer
) {
  // These should always be Accounts (did:mailto:), but if one's not, skip it.
  if (!isAccount(loginDelegation.issuer)) return { ok: [] }

  const accountDelegationsResult = await delegationsStorage.find({
    audience: loginDelegation.issuer.did(),
  })

  if (accountDelegationsResult.error) {
    return {
      error: {
        name: 'AccessClaimFailure',
        message: 'error finding delegations',
        cause: accountDelegationsResult.error,
      },
    }
  }

  return {
    ok: await createSessionProofs({
      service: signer,
      account: loginDelegation.issuer,
      agent: loginDelegation.audience,
      facts: loginDelegation.facts,
      capabilities: loginDelegation.capabilities,
      // We include all the delegations to the account so that the agent will
      // have delegation chains to all the delegated resources.
      // We should actually filter out only delegations that support delegated
      // capabilities, but for now we just include all of them since we only
      // implement sudo access anyway.
      delegationProofs: accountDelegationsResult.ok,
      expiration: Infinity,
    }),
  }
}
