import * as Datalogia from 'datalogia'
import * as API from '../types.js'
import * as Delegation from './delegation.js'
import { like } from './db/like.js'

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
 * @property {API.Audience} audience
 *
 * @param {DB} db
 * @param {object} query
 * @param {API.Audience} query.audience
 * @param {API.LikePattern} [query.subject]
 * @param {API.Can} [query.can]
 * @param {API.UTCUnixTimestamp} [query.time]
 * @returns {Authorization[]}
 */
export const find = (
  db,
  { subject = '%', audience, time = Date.now() / 1000, can = {} }
) => {
  const space = Datalogia.string()
  const abilities = Object.keys(can)
  const proofs =
    abilities.length > 0
      ? Object.fromEntries(abilities.map((can) => [can, Datalogia.link()]))
      : { '%': Datalogia.link() }

  const matches = Datalogia.query(db.index, {
    select: {
      ...proofs,
      space,
    },
    where: [
      ...Object.entries(proofs).flatMap(([need, proof]) => {
        const capability = Datalogia.link()
        const expiration = Datalogia.integer()
        const can = Datalogia.string()
        return [
          Datalogia.match([capability, 'capability/with', space]),
          Datalogia.match([capability, 'capability/can', can]),
          can.confirm((can) => matchAbility(need, can)),
          Datalogia.match([proof, 'ucan/capability', capability]),
          Datalogia.match([proof, 'ucan/audience', audience.did()]),
          Datalogia.match([proof, 'ucan/expiration', expiration]),
          expiration.confirm((value) => value > time),
        ]
      }),
      space.confirm((did) => like`${subject}`.test(did)),
    ],
  })

  return matches.map(({ space: did, ...proofs }) => {
    // query engine will provide proof for each requested capability, so we may
    // have duplicates here, which we prune.
    const keys = [...new Set(Object.values(proofs).map(String))]

    return {
      audience,
      subject: /** @type {API.SpaceDID} */ (did),
      // Dereference proofs from the store.
      proofs: keys.map(
        ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
      ),
    }
  })
}

/**
 * Returns true if requested `need` ability is satisfied by the given `can`
 * ability.
 *
 * @param {string} can
 * @param {string} need
 */
const matchAbility = (need, can) =>
  can === '*'
    ? true
    : need === '%'
    ? true
    : can.endsWith('/*')
    ? need.startsWith(can.slice(0, -1))
    : can === need
