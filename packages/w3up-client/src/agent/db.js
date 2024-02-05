import * as Datalogia from 'datalogia'
import * as API from '../types.js'
import * as Delegation from './delegation.js'
import * as Authorization from './authorization.js'
import * as Delegations from './delegations.js'
export * from 'datalogia'

/**
 * @param {API.Variant<{
 * proofs: Iterable<API.Delegation>,
 * archive: API.DatabaseArchive
 * }>} source
 * @returns  {API.Database}
 */
export const from = (source) =>
  source.proofs ? fromProofs(source.proofs) : fromArchive(source.archive)

/**
 * @param {API.Database} db
 * @returns {API.DatabaseArchive}
 */
export const toArchive = (db) => {
  const delegations = new Map()
  for (const [key, { meta, delegation }] of db.proofs) {
    delegations.set(key, {
      meta,
      delegation: Delegation.toArchive(delegation),
    })
  }

  return { principal: db.signer, meta: db.meta, delegations }
}

/**
 * @param {Partial<API.DatabaseArchive>} archive
 * @returns {API.Database}
 */
export const fromArchive = ({
  principal,
  meta = { name: 'agent', type: 'device' },
  delegations = new Map(),
}) => {
  const proofs = new Map()

  for (const { meta, delegation } of delegations.values()) {
    const proof = Delegation.fromArchive(delegation)
    proofs.set(`${proof.cid}`, { delegation, meta })
  }

  const db = Datalogia.Memory.create(Delegations.facts(proofs.values()))

  return {
    meta,
    signer: principal,
    proofs,
    index: db,
    transactor: db,
  }
}

/**
 * Builds a database from the given set of proofs.
 *
 * @param {Iterable<API.Delegation>} source
 * @returns  {API.Database}
 */
export const fromProofs = (source) => {
  const proofs = new Map(
    [...source].map((proof) => [
      `${proof.cid}`,
      {
        meta: {},
        delegation: proof,
      },
    ])
  )

  const db = Datalogia.Memory.create(Delegations.facts(proofs.values()))
  return {
    meta: { name: 'agent', type: 'device' },
    proofs,
    signer: undefined,
    index: db,
    transactor: db,
  }
}

/**
 * @param {object} source
 * @param {API.DataStore} [source.store]
 * @returns {Promise<API.Result<API.Database, API.DataStoreOpenError>>}
 */
export const open = async ({ store }) => {
  try {
    const archive = store ? await store.load() : null
    const db = fromArchive(archive ?? {})
    return { ok: { ...db, store } }
  } catch (cause) {
    return {
      error: new DataStoreOpenError('Failed to open a datastore', {
        cause,
      }),
    }
  }
}

/**
 * @param {API.Database} db
 * @returns {Promise<API.Result<API.Unit, API.DataStoreSaveError>>}
 */
export const save = async (db) => {
  const archive = toArchive(db)
  if (db.store) {
    try {
      await db.store.save(archive)
    } catch (cause) {
      return {
        error: new DataStoreSaveError('Failed to store data', { cause }),
      }
    }
  }

  return { ok: {} }
}

/**
 * Rebuilds proofs index from the proofs the proofs.
 *
 * @param {API.Database} db
 */
export const reindex = (db) => {
  db.index = Datalogia.Memory.create(Delegations.facts(db.proofs.values()))

  return db
}

/**
 * @typedef {API.Variant<{ proof: API.Delegation, signer: API.SignerArchive<API.DID, any> }>} Instruction
 * @param {API.Database} db
 * @param {Iterable<Instruction>} transaction
 * @returns {Promise<API.Result<API.Database, API.DatabaseTransactionError|API.DataStoreSaveError>>}
 */
export const transact = async (db, transaction) => {
  const instructions = []
  for (const each of transaction) {
    if (each.proof) {
      const { proof } = each
      db.proofs.set(`${proof.cid}`, { meta: {}, delegation: proof })
      for (const fact of Delegation.facts(proof)) {
        instructions.push({ Associate: fact })
      }
    } else if (each.signer) {
      db.signer = each.signer
    }
  }
  const result = await db.transactor.transact(instructions)
  if (result.error) {
    return {
      error: new DatabaseTransactionError(transaction, { cause: result.error }),
    }
  }

  const { error } = await save(db)
  if (error) {
    return { error }
  }

  return { ok: db }
}

/**
 * Returns authorizations that match the given query, that is they provide
 * abilities to the given audience.
 *
 * @typedef {object} Authorization
 * @property {API.SpaceDID} subject
 * @property {API.Delegation[]} proofs
 * @property {API.DID} audience
 *
 * @param {API.Database} db
 * @param {object} query
 * @param {API.TextConstraint} query.audience
 * @param {API.TextConstraint} [query.subject]
 * @param {API.Can} [query.can]
 * @param {API.UTCUnixTimestamp} [query.time]
 * @returns {Authorization[]}
 */
export const find = (
  db,
  { subject = { like: '%' }, audience, time = Date.now() / 1000, can = {} }
) =>
  Datalogia.query(
    db.index,
    Authorization.query({
      can,
      subject,
      audience,
      time,
    })
  ).map(({ subject, audience, ...proofs }) => {
    // query engine will provide proof for each requested capability, so we may
    // have duplicates here, which we prune.
    const keys = [...new Set(Object.values(proofs).map(String))]

    return {
      audience: /** @type {API.DID} */ (audience),
      subject: /** @type {API.SpaceDID} */ (subject),
      // Dereference proofs from the store.
      proofs: keys.map(
        ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
      ),
    }
  })

class DataStoreOpenError extends Error {
  name = /** @type {const} */ ('DataStoreOpenError')
}

class DataStoreSaveError extends Error {
  name = /** @type {const} */ ('DataStoreSaveError')
}

class DatabaseTransactionError extends Error {
  name = /** @type {const} */ ('DatabaseTransactionError')
  /**
   *
   * @param {Iterable<Instruction>} transaction
   * @param {object} options
   * @param {Error} options.cause
   */
  constructor(transaction, { cause }) {
    super('Failed to transact')
    this.transaction = transaction
    this.cause = cause
  }
}
