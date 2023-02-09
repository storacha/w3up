import * as Server from '@ucanto/server'
import { claim } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { toDelegationsDict } from './delegations.js'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessClaimProvider(ctx) {
  return Server.provide(claim, async ({ capability, invocation }) => {
    return {}
  })
}

/**
 * @typedef AccessClaimSuccess
 * @property {Record<string,Ucanto.UCANLink>} delegations
 */

/**
 * @callback AccessClaimHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessClaim>} invocation
 * @returns {Promise<Ucanto.Result<AccessClaimSuccess, { error: true }>>}
 */

/**
 * @param {object} options
 * @param {import('../types/delegations').DelegationsStorage} options.delegations
 * @returns {AccessClaimHandler}
 */
export function createAccessClaimHandler({ delegations }) {
  return async (invocation) => {
    return {
      delegations: toDelegationsDict([...delegations]),
    }
  }
}
