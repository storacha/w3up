import * as Ucanto from '@ucanto/interface'

/**
 * DelegationsStorage that stores in-memory.
 *
 * @returns {import("../types/delegations").DelegationsStorage}
 */
export function createDelegationsStorage() {
  return /** @type {Array<Ucanto.Delegation>} */ ([])
}

/**
 * Given array of delegations, return a valid value for access/delegate nb.delegations
 *
 * @param {Array<Ucanto.Delegation>} delegations
 */
export function toDelegationsDict(delegations) {
  return Object.fromEntries(delegations.map((d) => [d.cid.toString(), d.cid]))
}
