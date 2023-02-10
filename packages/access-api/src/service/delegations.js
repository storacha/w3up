import * as Ucanto from '@ucanto/interface'

/**
 * DelegationsStorage that stores in-memory.
 *
 * @param {Array<Ucanto.Delegation>} delegations
 * @returns {import("../types/delegations").DelegationsStorage}
 */
export function createDelegationsStorage(delegations = []) {
  const storage = Object.assign(delegations, {
    async *[Symbol.asyncIterator]() {
      for (const delegation of delegations) {
        yield delegation
      }
    },
  })
  return storage
}

/**
 * Given array of delegations, return a valid value for access/delegate nb.delegations
 *
 * @param {Array<Ucanto.Delegation>} delegations
 */
export function toDelegationsDict(delegations) {
  return Object.fromEntries(delegations.map((d) => [d.cid.toString(), d.cid]))
}
