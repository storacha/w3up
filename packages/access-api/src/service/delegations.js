import * as Ucanto from '@ucanto/interface'

// without this alias, eslint jsdoc/check-types will complain below
/* eslint-disable jsdoc/check-types */
/**
 * @typedef {typeof Symbol.iterator} SymbolIterator
 */
/* eslint-enable jsdoc/check-types */

/**
 * DelegationsStorage that stores in-memory.
 *
 * @param {Pick<Array<Ucanto.Delegation>, 'length' | 'push' | SymbolIterator>} storage
 * @returns {import("../types/delegations").DelegationsStorage}
 */
export function createDelegationsStorage(storage = []) {
  /** @type {import("../types/delegations").DelegationsStorage[typeof Symbol.asyncIterator]} */
  async function* asyncIterator() {
    for (const delegation of storage) {
      yield delegation
    }
  }
  /** @type {import("../types/delegations").DelegationsStorage['count']} */
  async function count() {
    return BigInt(storage.length)
  }
  /** @type {import("../types/delegations").DelegationsStorage['find']} */
  async function* find(query) {
    for (const d of storage) {
      if (d.audience.did() === query.audience) {
        yield d
      }
    }
  }
  /** @type {import("../types/delegations").DelegationsStorage['putMany']} */
  async function putMany(...args) {
    return storage.push(...args)
  }
  /** @type {import('../types/delegations').DelegationsStorage} */
  const delegations = {
    [Symbol.asyncIterator]: asyncIterator,
    count,
    find,
    putMany,
  }
  return delegations
}

/**
 * Given array of delegations, return a valid value for access/delegate nb.delegations
 *
 * @param {Array<Ucanto.Delegation>} delegations
 */
export function toDelegationsDict(delegations) {
  return Object.fromEntries(delegations.map((d) => [d.cid.toString(), d.cid]))
}
