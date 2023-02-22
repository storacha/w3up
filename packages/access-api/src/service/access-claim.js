import * as Server from '@ucanto/server'
import { claim } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { collect } from 'streaming-iterables'
import * as delegationsResponse from '../utils/delegations-response.js'

/**
 * @typedef {import('@web3-storage/capabilities/types').AccessClaimSuccess} AccessClaimSuccess
 * @typedef {import('@web3-storage/capabilities/types').AccessClaimFailure} AccessClaimFailure
 */

/**
 * @callback AccessClaimHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessClaim>} invocation
 * @returns {Promise<Ucanto.Result<AccessClaimSuccess, AccessClaimFailure>>}
 */

/**
 * @param {object} ctx
 * @param {import('../types/delegations').DelegationsStorage} ctx.delegations
 * @param {Pick<import('../bindings.js').RouteContext['config'], 'ENV'>} ctx.config
 */
export function accessClaimProvider(ctx) {
  const handleClaimInvocation = createAccessClaimHandler(ctx)
  return Server.provide(claim, async ({ invocation }) => {
    // disable until hardened in test/staging
    if (ctx.config.ENV === 'production') {
      throw new Error(`acccess/claim invocation handling is not enabled`)
    }
    return handleClaimInvocation(invocation)
  })
}

/**
 * @param {object} options
 * @param {import('../types/delegations').DelegationsStorage} options.delegations
 * @returns {AccessClaimHandler}
 */
export function createAccessClaimHandler({ delegations }) {
  /** @type {AccessClaimHandler} */
  return async (invocation) => {
    // @todo - this should filter based on invocation param
    // https://github.com/web3-storage/w3protocol/issues/394
    const claimed = await collect(delegations)
    return {
      delegations: delegationsResponse.encode(claimed),
    }
  }
}
