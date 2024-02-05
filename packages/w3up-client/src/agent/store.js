import * as API from '../types.js'
import * as Connection from './connection.js'
import * as DB from './db.js'
import { Signer, ed25519 } from '@ucanto/principal'

/** @type {Connection.Archive} */
const ADDRESS = {
  id: 'did:web:web3.storage',
  url: 'https://up.web3.storage',
}

/**
 * @typedef {object} Model
 * @property {Connection.Address} address
 * @property {API.Signer} principal
 * @property {DB.DB} delegations
 * @property {API.AgentMeta} meta
 * @property {API.DIDKey} [currentSpace]
 */

/**
 * @typedef {object} Store
 * @property {Model} state
 * @property {API.Storage<Archive>} storage
 */

/**
 *
 * @param {object} store
 * @param {Model} store.state
 * @returns {Archive}
 */
export const toArchive = ({ state }) => ({
  connection: Connection.toArchive(state.address),
  meta: state.meta,
  principal: state.principal.toArchive(),
  delegations: DB.toArchive(state.delegations),
  currentSpace: state.currentSpace,
})

/**
 * @typedef {object} Archive
 * @property {Connection.Archive} [connection]
 * @property {API.AgentMeta} meta
 * @property {API.SignerArchive<API.DID, any>} principal
 * @property {DB.Archive} delegations
 * @property {API.DIDKey} [currentSpace]
 */

/**
 * @param {API.Storage<Archive>} storage
 * @param {object} options
 * @param {API.Signer} [options.principal]
 * @param {API.Delegation[]} [options.proofs]
 */
export const open = async (storage, options = {}) => {
  try {
    const archive = await storage.load()
    if (archive) {
      const state = {
        meta: archive.meta,
        principal: options.principal ?? Signer.from(archive.principal),
        delegations: DB.fromArchive(archive.delegations),
        currentSpace: archive.currentSpace,
        address: Connection.fromArchive(archive.connection ?? ADDRESS),
      }

      if (options.proofs) {
        await assert({ storage, state }, { delegations: options.proofs })
      }

      return { ok: { storage, state } }
    } else {
      const state = {
        meta: {},
        principal: options.principal ?? (await ed25519.generate()),
        delegations: DB.fromProofs(options.proofs ?? []),
        currentSpace: undefined,
        address: Connection.fromArchive(ADDRESS),
      }

      return { ok: { storage, state } }
    }
  } catch (error) {
    return { error: new Error('Failed to load agent data from storage') }
  }
}

export const load = async (storage) => {
  const result = await open(storage, options)
  if (result.ok) {
    return result.ok
  } else {
    throw result.error
  }
}

/**
 * @param {Store} store
 * @param {API.Variant<{
 *  meta: API.AgentMeta
 *  delegations: API.Delegation[]
 *  currentSpace: API.DIDKey
 * }>} fact
 */
export const assert = async ({ storage, state }, fact) => {
  if (fact.meta) {
    state.meta = { ...state.meta, ...fact.meta }
  } else if (fact.currentSpace) {
    state.currentSpace = fact.currentSpace
  } else if (fact.delegations) {
    for (const delegation of fact.delegations) {
      await DB.assert(state.delegations, delegation)
    }
  }
  await storage.save(toArchive({ state }))
}

/**
 * @param {Store} store
 * @param {API.Variant<{
 * delegations: API.Delegation[]
 * }>} fact
 */
export const retract = async ({ state, storage }, fact) => {
  if (fact.delegations) {
    for (const delegation of fact.delegations) {
      state.delegations.proofs.delete(`${delegation.cid}`)
    }
    state.delegations = DB.reindex(state.delegations)
  }
  await storage.save(toArchive({ state }))
}
