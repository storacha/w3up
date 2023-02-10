import * as Server from '@ucanto/server'
import { claim } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { toDelegationsDict } from './delegations.js'
import { collect } from 'streaming-iterables'

/**
 * @typedef AccessClaimSuccess
 * @property {Record<string,Ucanto.UCANLink>} delegations
 */

/**
 * @typedef {{ error: true }} AccessClaimFailure
 * @typedef {Ucanto.Result<AccessClaimSuccess, AccessClaimFailure>} AccessClaimResult
 */

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessClaimProvider(ctx) {
  return Server.provide(claim, async ({ capability, invocation }) => {
    return {}
  })
}

/**
 * @callback AccessClaimHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessClaim>} invocation
 * @returns {Promise<AccessClaimResult>}
 */

/**
 * @param {object} options
 * @param {import('../types/delegations').DelegationsStorage} options.delegations
 * @returns {AccessClaimHandler}
 */
export function createAccessClaimHandler({ delegations }) {
  /** @type {AccessClaimHandler} */
  return async (invocation) => {
    return {
      delegations: toDelegationsDict(await collect(delegations)),
    }
  }
}
