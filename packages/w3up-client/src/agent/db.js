import * as Datalogia from 'datalogia'
import * as API from '../types.js'
import * as Delegation from './delegation.js'
import * as Delegations from './delegations.js'
export * from 'datalogia'
export * as Text from './db/text.js'
import * as Task from '../task.js'

/**
 *
 * @param {Datalogia.Clause} clause
 * @returns
 */
export const optional = (clause) => Datalogia.or(clause, Datalogia.not(clause))

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
    proofs.set(`${proof.cid}`, { delegation: proof, meta })
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
 * @returns {Task.Invocation<API.Database, API.DataStoreOpenError>}
 */
export const open = ({ store }) =>
  Task.spawn(function* () {
    try {
      const archive = store ? yield* Task.wait(store.load()) : null
      const db = fromArchive(archive ?? {})
      return { ...db, store }
    } catch (cause) {
      return yield* Task.fail(
        new DataStoreOpenError('Failed to open a datastore', {
          cause,
        })
      )
    }
  })

/**
 * @param {API.Database} db
 * @returns {Task.Invocation<API.Unit, API.DataStoreSaveError|Task.AbortError>}
 */
export const save = (db) =>
  Task.spawn(function* () {
    const archive = toArchive(db)
    if (db.store) {
      try {
        yield* Task.wait(db.store.save(archive))
      } catch (cause) {
        return Task.fail(
          new DataStoreSaveError('Failed to store data', { cause })
        )
      }
    }

    return {}
  })

/**
 * @param {API.Database} db
 * @param {API.DBTransaction} transaction
 * @returns {Task.Task<API.Database, API.DatabaseTransactionError|API.DataStoreSaveError>}
 */
export const transact = (db, transaction) =>
  Task.spawn(function* () {
    const assertions = []
    let reindex = false
    for (const { assert, retract } of transaction) {
      if (assert) {
        const { proof, signer } = assert
        if (proof) {
          db.proofs.set(`${proof.cid}`, { meta: {}, delegation: proof })
          for (const fact of Delegation.facts(proof)) {
            assertions.push({ Associate: fact })
          }
        } else if (signer) {
          db.signer = signer
        } else {
          return yield* Task.fail(
            new DatabaseTransactionError(
              `Transaction contains unknown assertion`,
              { cause: assert, transaction }
            )
          )
        }
      }

      if (retract) {
        const { proof, signer } = retract
        // Note we do not delete delegation proofs from the database as they
        // may be referenced by other proofs. In fact we should probably just
        // mark this proof as retracted instead of deleting them, and re-indexing
        // but for now this will do.
        if (proof) {
          db.proofs.delete(`${proof.cid}`)
          reindex = true
        } else if (signer) {
          delete db.signer
        } else {
          return yield* Task.fail(
            new DatabaseTransactionError(
              `Transaction contains unknown retraction`,
              { cause: retract, transaction }
            )
          )
        }
      }

      const commit = yield* Task.wait(db.transactor.transact(assertions))
      if (commit.error) {
        return yield* Task.fail(
          new DatabaseTransactionError(commit.error.message, {
            cause: commit.error,
            transaction,
          })
        )
      }
    }

    // If we end up removing some proofs we need to rebuild index in order to
    // prune facts that are no longer valid.
    if (reindex) {
      const state = Datalogia.Memory.create(
        Delegations.facts(db.proofs.values())
      )
      db.index = state
      db.transactor = state
    }

    // Finally we save changes in the database store.
    yield* save(db)

    return db
  })

/**
 * Creates a retraction instruction.
 *
 * @param {API.DBAssertion} assertion
 * @returns {API.DBInstruction}
 */
export const retract = (assertion) => ({ retract: assertion })

/**
 * Creates an assertion instruction.
 *
 * @param {API.DBAssertion} assertion
 * @returns {API.DBInstruction}
 */
export const assert = (assertion) => ({ assert: assertion })

class DataStoreOpenError extends Error {
  name = /** @type {const} */ ('DataStoreOpenError')
}

class DataStoreSaveError extends Error {
  name = /** @type {const} */ ('DataStoreSaveError')
}

class DatabaseTransactionError extends Error {
  name = /** @type {const} */ ('DatabaseTransactionError')
  /**
   * @param {string} message
   * @param {object} options
   * @param {API.DBTransaction} options.transaction
   * @param {Error} options.cause
   */
  constructor(message, { transaction, cause }) {
    super(message)
    this.transaction = transaction
    this.cause = cause
  }
}
