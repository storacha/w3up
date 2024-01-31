import * as Datalogia from 'datalogia'
import * as API from '../types.js'
import * as Delegation from './delegation.js'

export * from 'datalogia'

/**
 * {@link Proofs} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 *
 * @typedef {API.AgentDataExport['delegations']} Archive
 */

/**
 * Set of delegations available to the agent. For legacy reasons, they are boxed
 * and have optional `meta` field.
 *
 * @typedef {API.AgentData['delegations']} Proofs
 */

/**
 * Database consists of `proofs` and an `index` of those proofs used for
 * querying. We may drop `proofs` in the future and persist `index` directly,
 * but right now we keep them both around.
 *
 * @typedef {object} DB
 * @property {Proofs} proofs
 * @property {Datalogia.Querier & Datalogia.Transactor} index
 */

/**
 * Takes {@link Archive} and returns {@link DB} which can be used to restore
 * persisted session.
 *
 * @param {Archive} archive
 * @returns {DB}
 */
export const fromArchive = (archive) => {
  const delegations = []
  const proofs = new Map()

  for (const { meta, delegation } of archive.values()) {
    const proof = Delegation.fromArchive(delegation)
    delegations.push(proof)
    proofs.set(`${proof.cid}`, { delegation, meta })
  }

  return {
    index: Datalogia.Memory.create(facts(delegations)),
    proofs,
  }
}

/**
 * Formats {@link DB} into {@link Archive} so it can be stored in the database.
 * This is used to persist the state of the agent across sessions.
 *
 * @param {DB} db
 * @returns {Archive}
 */
export const toArchive = (db) => {
  const archive = new Map()
  for (const [key, { meta, delegation }] of db.proofs) {
    archive.set(key, {
      meta,
      delegation: Delegation.toArchive(delegation),
    })
  }

  return archive
}

/**
 * Builds a database from the given set of proofs.
 *
 * @param {Iterable<API.Delegation>} proofs
 * @returns  {DB}
 */
export const fromProofs = (proofs) => ({
  proofs: new Map(
    [...proofs].map((proof) => [
      `${proof.cid}`,
      {
        meta: {},
        delegation: proof,
      },
    ])
  ),
  index: Datalogia.Memory.create(facts(proofs)),
})

/**
 * @param {API.Variant<{proofs: Iterable<API.Delegation>, archive: Archive }>} source
 * @returns  {DB}
 */
export const from = (source) =>
  source.proofs ? fromProofs(source.proofs) : fromArchive(source.archive)

/**
 *
 * @param {Iterable<API.Delegation>} proofs
 * @returns {Iterable<Datalogia.Fact>}
 */
export const facts = function* (proofs) {
  for (const proof of proofs) {
    yield* Delegation.assert(proof)
  }
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
 * @param {DB} db
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
) => {
  const space = Datalogia.string()
  const abilities = Object.keys(can)
  const principal = Datalogia.string()
  const proofs = Object.fromEntries(
    abilities.map((can) => [can, Datalogia.link()])
  )

  const matches = Datalogia.query(db.index, {
    select: {
      ...proofs,
      space,
      principal,
    },
    where: [
      ...Object.entries(proofs).flatMap(([need, proof]) => {
        const capability = Datalogia.link()
        return [
          Datalogia.match([capability, 'capability/with', space]),
          providesAbility({ capability, ability: need }),
          Datalogia.match([proof, 'ucan/capability', capability]),
          Datalogia.match([proof, 'ucan/audience', principal]),
          matchText(principal, audience),
          Datalogia.not(isExpired({ ucan: proof, time })),
          Datalogia.not(isTooEarly({ ucan: proof, time })),
        ]
      }),
      matchText(space, subject),
    ],
  })

  return matches.map(({ space: did, principal, ...proofs }) => {
    // query engine will provide proof for each requested capability, so we may
    // have duplicates here, which we prune.
    const keys = [...new Set(Object.values(proofs).map(String))]

    return {
      audience: /** @type {API.DID} */ (principal),
      subject: /** @type {API.SpaceDID} */ (did),
      // Dereference proofs from the store.
      proofs: keys.map(
        ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
      ),
    }
  })
}

/**
 *
 * @param {Datalogia.Term<string>} source
 * @param {API.TextConstraint} constraint
 */
const matchText = (source, constraint) =>
  constraint.glob != null
    ? Datalogia.glob(source, constraint.glob)
    : constraint.like != null
    ? Datalogia.like(source, constraint.like)
    : Datalogia.Constraint.is(source, constraint)

/**
 * Composes the clause that matches given `query.ucan` only if it has expired,
 * that is it has `exp` field set and is less than given `query.time`.
 *
 * @param {object} query
 * @param {Datalogia.Term<Datalogia.Entity>} query.ucan
 * @param {Datalogia.API.Term<Datalogia.Int32>} query.time
 * @returns {Datalogia.Clause}
 */
const isExpired = ({ ucan, time }) => {
  const expiration = Datalogia.integer()
  return Datalogia.match([ucan, 'ucan/expiration', expiration]).and(
    Datalogia.Constraint.greater(time, expiration)
  )
}

/**
 * Composes the clause that will match a `query.ucan` only if is not active yet,
 * that is it's `nbf` field is set and greater than given `query.time`.
 *
 * @param {object} query
 * @param {Datalogia.Term<Datalogia.Entity>} query.ucan
 * @param {Datalogia.API.Term<Datalogia.Int32>} query.time
 * @returns {Datalogia.Clause}
 */
const isTooEarly = ({ ucan, time }) => {
  const notBefore = Datalogia.integer()
  return Datalogia.match([ucan, 'ucan/notBefore', notBefore]).and(
    Datalogia.Constraint.less(time, notBefore)
  )
}

/**
 *
 * @param {object} query
 * @param {Datalogia.Term<Datalogia.Entity>} query.capability
 * @param {string} query.ability
 */
const providesAbility = ({ capability, ability }) => {
  const can = Datalogia.string()
  return Datalogia.match([capability, 'capability/can', can]).and(
    // can is a glob pattern that we try to match against
    Datalogia.glob(ability, can)
  )
}
