import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as API from '../types.js'
import * as delegationsResponse from '../utils/delegations-response.js'

/**
 * @param {API.AccessClaimContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(Access.claim, (input) => claim(input, ctx))

/**
 * @param {API.Input<Access.claim>} input
 * @param {API.AccessClaimContext} ctx
 * @returns {Promise<API.Result<API.AccessClaimSuccess, API.AccessClaimFailure>>}
 */
export const claim = async (
  { invocation },
  { delegationsStorage: delegations }
) => {
  const claimedAudience = invocation.capabilities[0].with
  const claimedResult = await delegations.find({ audience: claimedAudience })
  if (claimedResult.error) {
    return {
      error: {
        name: 'AccessClaimFailure',
        message: 'error finding delegations',
        cause: claimedResult.error,
      },
    }
  }
  return {
    ok: {
      delegations: delegationsResponse.encode(claimedResult.ok),
    },
  }
}
