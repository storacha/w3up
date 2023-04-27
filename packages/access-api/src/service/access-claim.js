import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as API from '../api.js'
import * as delegationsResponse from '../utils/delegations-response.js'
import { collect } from 'streaming-iterables'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.DelegationsStorage} models.delegations
 * @param {Context} ctx
 */
export const provide = (ctx) =>
  Server.provide(Access.claim, (input) => claim(input, ctx))

/**
 * @param {object} input
 * @param {API.Invocation<API.AccessClaim>} input.invocation
 * @param {Context} ctx
 * @returns {Promise<API.Result<API.AccessClaimSuccess, API.AccessClaimFailure>>}
 */
export const claim = async ({ invocation }, { models: { delegations } }) => {
  const claimedAudience = invocation.capabilities[0].with
  const claimed = await collect(delegations.find({ audience: claimedAudience }))
  return {
    ok: {
      delegations: delegationsResponse.encode(claimed),
    },
  }
}
