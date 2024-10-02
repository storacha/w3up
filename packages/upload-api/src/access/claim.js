import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
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
 * @param {API.Principal} principal
 * @returns {principal is API.Principal<API.DID<'mailto'>>}
 */
const isAccount = (principal) => principal.did().startsWith('did:mailto:')

/**
 * Returns true when the delegation has a `ucan:*` capability.
 * @param {API.Delegation} delegation
 * @returns boolean
 */
const isUcanStar = (delegation) =>
  delegation.capabilities.some((capability) => capability.with === 'ucan:*')

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

  /** @type {API.Result<API.Delegation[], API.AccessClaimFailure>} */
  const delegationsResult = await Promise.all(
    storedDelegationsResult.ok.map(async (delegation) => {
      // If this Agent has been confirmed by any Accounts, we'll find `*`/`ucan:*`
      // delegations for them. But they won't have any proofs on them. They're proof
      // of login, but don't serve to give the Agent any actual capabilities. That's
      // our job.
      if (isUcanStar(delegation)) {
        // These delegations will actually have proofs granting access to the spaces.
        // This collection also includes the attestation delegations which validate
        // prove those delegations.
        const sessionProofsResult = await createSessionProofsForLogin(
          delegation,
          delegationsStorage,
          signer
        )

        if (sessionProofsResult.error) {
          throw {
            error: {
              name: 'AccessClaimFailure',
              message: 'error creating session proofs',
              cause: sessionProofsResult.error,
            },
          }
        }

        return sessionProofsResult.ok
      } else {
        return [delegation]
      }
    })
  )
    .then((delegations) => ({ ok: delegations.flat() }))
    .catch((error) => ({ error }))

  if (delegationsResult.error) {
    return delegationsResult
  }

  return {
    ok: {
      delegations: delegationsResponse.encode(delegationsResult.ok),
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
