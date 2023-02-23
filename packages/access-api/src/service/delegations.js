import * as Ucanto from '@ucanto/interface'

/**
 * DelegationsStorage that stores in-memory.
 *
 * @param {Array<Ucanto.Delegation>} delegations
 * @returns {import("../types/delegations").DelegationsStorage}
 */
export function createDelegationsStorage(delegations = []) {
  /** @type {import("../types/delegations").DelegationsStorage[typeof Symbol.asyncIterator]} */
  async function* asyncIterator() {
    for (const delegation of delegations) {
      yield delegation
    }
  }
  /** @type {import("../types/delegations").DelegationsStorage['count']} */
  async function count() {
    return BigInt(delegations.length)
  }
  /** @type {import("../types/delegations").DelegationsStorage['putMany']} */
  async function putMany(...args) {
    return delegations.push(...args)
  }
  /** @type {import('../types/delegations').DelegationsStorage} */
  const storage = {
    [Symbol.asyncIterator]: asyncIterator,
    count,
    putMany,
  }
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
