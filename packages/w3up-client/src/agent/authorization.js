import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Capability from './capability.js'
import * as Delegation from './delegation.js'
import * as Text from './db/text.js'

export { Capability, Delegation, Text }

/**
 * @param {API.Authorization} model
 */
export const from = (model) => new Authorization(model)

/**
 * @param {API.Database} db
 * @param {object} query
 * @param {API.DID} query.authority - Authority authorization is claimed for.
 * @param {API.DID} query.subject - Subject space authorization is claimed for.
 * @param {API.Can} query.can - Abilities claimed to be authorized.
 * @returns {API.Result<API.Authorization, API.AccessDenied>}
 */
export const get = (db, { authority, subject, can }) => {
  // If subject of the claim is same DID as the authority, claiming there
  // no proofs required.
  if (authority === subject) {
    return {
      ok: new Authorization({
        authority,
        can: {
          '*': [],
        },
        subject,
        proofs: [],
      }),
    }
  } else {
    const result = find(db, {
      authority,
      subject,
      can,
    })
    if (result.length > 0) {
      return { ok: result[0] }
    } else {
      return {
        error: new AccessDenied(
          `The ${authority} has no access to ${JSON.stringify(
            can
          )} on ${subject}`
        ),
      }
    }
  }
}

class AccessDenied extends Error {
  name = /** @type {const} */ ('AccessDenied')
}

/**
 * Returns authorizations that match the given query, that is they provide
 * abilities to the given audience.
 *
 * @param {API.Database} db
 * @param {object} query
 * @param {API.TextConstraint} query.authority
 * @param {API.TextConstraint} [query.subject]
 * @param {API.Can} [query.can]
 * @param {API.UTCUnixTimestamp} [query.time]
 * @returns {Authorization[]}
 */
export const find = (
  db,
  { subject = { glob: '*' }, authority, time = Date.now() / 1000, can }
) =>
  DB.query(
    db.index,
    query({
      can,
      subject,
      authority,
      time,
    })
  ).map((match) => select(db, match))

/**
 * @typedef {object} ProofSelector
 * @property {DB.Term<DB.Entity>} proof
 * @property {DB.Term<string>} can
 * @property {string} [need]
 *
 * @typedef {object} Selector
 * @property {DB.Term<API.DID>} authority
 * @property {DB.Term<API.DID>} subject
 * @property {ProofSelector[]} proofs
 */

/**
 * Creates query that select set of proofs that would allow the
 * `selector.audience` to invoke abilities described in `selector.can` on the
 * `selector.subject` when time is `selector.time`.
 *
 * @param {object} selector
 * @param {API.TextConstraint} selector.authority
 * @param {API.Can} [selector.can]
 * @param {API.TextConstraint} [selector.subject]
 * @param {API.UTCUnixTimestamp} [selector.time]
 * @returns {API.Query<Selector>}
 */
export const query = ({ can = {}, time = Date.now() / 1000, ...selector }) => {
  const subject = DB.string()
  const authority = DB.string()
  const need = Object.keys(can)
  /** @type {{proof: DB.Term<DB.Entity>, can: DB.Term<API.Ability>, need?: string }[]} */
  const proofs = need.length
    ? need.map((need) => ({ proof: DB.link(), need, can: DB.string() }))
    : [{ proof: DB.link(), can: DB.string() }]

  const where = proofs.map(({ proof, need, can }) => {
    const clause = match(proof, {
      subject,
      can,
      authority,
      time,
    })

    return need ? clause.and(DB.glob(need, can)) : clause
  })

  return {
    select: {
      proofs,
      subject,
      authority,
    },
    where: [
      ...where,
      Text.match(subject, selector.subject ?? { glob: '*' }),
      Text.match(authority, selector.authority),
    ],
  }
}

/**
 * @param {API.Database} db
 * @param {DB.InferBindings<Selector>} match
 */
export const select = (db, { authority, subject, proofs }) => {
  // query engine will provide proof for each requested capability, so we may
  // have duplicates here, which we prune.
  const keys = [...new Set(proofs.map(({ proof }) => String(proof)))]

  return new Authorization({
    authority: /** @type {API.DID} */ (authority),
    subject: /** @type {API.SpaceDID} */ (subject),
    can: Object.fromEntries(proofs.map(({ can, need }) => [need ?? can, []])),
    // Dereference proofs from the store.
    proofs: keys.map(
      ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
    ),
  })
}

/**
 * Matches a delegation that authorizes the `selector.authority` with an ability
 * to invoke `selector.can` on `selector.subject` at `selector.time`. Please note
 * that it will only match explicit authorization that is one that specifies
 * `selector.subject` and will not match implicit authorizations that uses
 * `ucan:*` capability.
 *
 * @param {DB.Term<DB.Link>} delegation
 * @param {object} selector
 * @param {DB.Term<API.UTCUnixTimestamp>} [selector.time]
 * @param {DB.Term<string>} [selector.can]
 * @param {DB.Term<string>} [selector.subject]
 * @param {DB.Term<API.DID>} [selector.authority]
 */
export const explicit = (
  delegation,
  {
    authority = DB.string(),
    subject = DB.string(),
    can = DB.string(),
    time = DB.integer(),
  }
) => {
  const capability = DB.link()

  return Capability.match(capability, { can, subject }).and(
    Delegation.match(delegation, {
      capability,
      audience: authority,
      time,
    })
  )
}

/**
 * Matches a delegation that authorizes the `selector.authority` with an ability
 * to invoke `selector.can` on `selector.subject` at `selector.time`. Please note
 * that it will only match implicit authorization that is one that has `ucan:*`
 * subject and is either issued by `selector.subject` or has a proof which
 * explicitly delegates `selector.can` to `selector.subject`.
 *
 * @param {DB.Term<DB.Link>} delegation
 * @param {object} selector
 * @param {DB.Term<API.UTCUnixTimestamp>} [selector.time]
 * @param {DB.Term<API.Ability>} [selector.can]
 * @param {DB.Term<API.DID>} [selector.subject]
 * @param {DB.Term<API.DID>} [selector.authority]
 * @returns {DB.Clause}
 */
export const implicit = (
  delegation,
  {
    subject = DB.string(),
    can = DB.string(),
    time = DB.integer(),
    authority = DB.string(),
  }
) => {
  const proof = DB.link()
  return DB.and(
    Delegation.forwards(delegation, {
      audience: authority,
      can,
      time,
    }),
    DB.or(
      Delegation.issuedBy(delegation, subject),
      DB.and(
        Delegation.hasProof(delegation, proof),
        DB.or(
          explicit(proof, { subject, can, time })
          // TODO: Add support for recursive implicit delegation
          // implicit(proof, { subject, can, time, authority })
        )
      )
    )
  )
}

/**
 * @param {DB.Term<DB.Link>} delegation
 * @param {object} selector
 * @param {DB.Term<API.UTCUnixTimestamp>} [selector.time]
 * @param {DB.Term<API.Ability>} [selector.can]
 * @param {DB.Term<API.DID>} [selector.subject]
 * @param {DB.Term<API.DID>} [selector.authority]
 */
export const match = (
  delegation,
  {
    authority = DB.string(),
    subject = DB.string(),
    can = DB.string(),
    time = DB.integer(),
  }
) =>
  DB.or(
    explicit(delegation, { authority, can, subject, time }),
    implicit(delegation, { authority, can, subject, time })
  )

/**
 * @typedef {object} Model
 * @property {API.SpaceDID} subject
 * @property {API.Delegation[]} proofs
 * @property {API.DID} authority
 */
class Authorization {
  /**
   *
   * @param {API.Authorization} model
   */
  constructor(model) {
    this.model = model
  }
  get can() {
    return this.model.can
  }
  get proofs() {
    return this.model.proofs
  }
  [Symbol.iterator]() {
    return this.model.proofs
  }
  get authority() {
    return this.model.authority
  }
  get subject() {
    return this.model.subject
  }

  toJSON() {
    return {
      authority: this.authority,
      subject: this.subject,
      can: this.can,
      proofs: this.proofs,
    }
  }
}
