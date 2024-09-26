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

  // If this Agent has been confirmed by any Accounts, we'll find `*`/`ucan:*`
  // delegations for them. But they won't have any proofs on them. They're proof
  // of login, but don't serve to give the Agent any actual capabilities. That's
  // our job.
  const loginDelegations = storedDelegationsResult.ok.filter((delegation) => {
    return delegation.capabilities.some((capability) => {
      return capability.can === '*' && capability.with === 'ucan:*'
    })
  })

  // These delegations will actually have proofs granting access to the spaces.
  // This collection also includes the attestation delegations which validate
  // prove those delegations.
  const sessionProofsResult = await createSessionProofsForLogins(
    loginDelegations,
    delegationsStorage,
    signer
  )

  if (sessionProofsResult.error) {
    return {
      error: {
        name: 'AccessClaimFailure',
        message: 'error creating session proofs',
        cause: sessionProofsResult.error,
      },
    }
  }

  return {
    ok: {
      delegations: delegationsResponse.encode(sessionProofsResult.ok),
    },
  }
}

/**
 * @param {API.Delegation[]} loginDelegations
 * @param {API.DelegationsStorage} delegationsStorage
 * @param {API.Signer} signer
 * @returns {Promise<API.Result<API.Delegation[], API.AccessClaimFailure>>}
 */
async function createSessionProofsForLogins(
  loginDelegations,
  delegationsStorage,
  signer
) {
  const sessionProofPairsResults = await Promise.all(
    // Each star delegation should represent an account we're logged in as.
    // Normally there's only one, but more than one is possible and valid.
    loginDelegations.map(async (delegation) => {
      // These should always be Accounts (did:mailto:), but if one's not, skip
      // it.
      if (!isAccount(delegation.issuer)) return { ok: [] }

      const accountDelegationsResult = await delegationsStorage.find({
        audience: delegation.issuer.did(),
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
          account: delegation.issuer,
          agent: delegation.audience,
          facts: delegation.facts,
          capabilities: delegation.capabilities,
          // We include all the delegations to the account so that the agent will
          // have delegation chains to all the delegated resources.
          // We should actually filter out only delegations that support delegated
          // capabilities, but for now we just include all of them since we only
          // implement sudo access anyway.
          delegationProofs: accountDelegationsResult.ok,
          expiration: Infinity,
        }),
      }
    })
  )

  if (sessionProofPairsResults.some((result) => result.error)) {
    return {
      error: {
        name: 'AccessClaimFailure',
        message: 'error creating session proofs',
        cause: sessionProofPairsResults.find((result) => result.error),
      },
    }
  }

  return {
    ok: sessionProofPairsResults.flatMap((result) =>
      // result.ok is always present here, but TS-in-JS can't tell that.
      result.ok ? result.ok : []
    ),
  }
}
