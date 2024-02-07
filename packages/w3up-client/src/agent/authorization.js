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
  ).map(({ subject, authority, proofs }) => {
    // query engine will provide proof for each requested capability, so we may
    // have duplicates here, which we prune.
    const keys = [...new Set(proofs.map(({ proof }) => String(proof)))]

    return new Authorization({
      authority: /** @type {API.DID} */ (authority),
      subject: /** @type {API.SpaceDID} */ (subject),
      can: can ?? Object.fromEntries(proofs.map(({ can }) => [can, []])),
      // Dereference proofs from the store.
      proofs: keys.map(
        ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
      ),
    })
  })

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
 */
export const query = ({ can = {}, time = Date.now() / 1000, ...selector }) => {
  const subject = DB.string()
  const authority = DB.string()
  const need = Object.keys(can)
  /** @type {{proof: DB.Term<DB.Entity>, can: DB.Term<string>, need?: string }[]} */
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
 * @param {DB.Term<DB.Link>} delegation
 * @param {object} selector
 * @param {API.UTCUnixTimestamp} selector.time
 * @param {DB.Term<string>} [selector.can]
 * @param {DB.Term<string>} [selector.subject]
 * @param {DB.Term<API.DID>} [selector.authority]
 */
export const match = (
  delegation,
  { authority = DB.string(), subject = DB.string(), can = DB.string(), time }
) => {
  const capability = DB.link()

  // simple case where capability is directly delegated to the audience
  const direct = Capability.match(capability, {
    can,
    subject,
  }).and(
    Delegation.match(delegation, {
      capability,
      audience: authority,
      time,
    })
  )

  const everything = DB.link()
  const proof = DB.link()
  const account = DB.string()
  // Complicated case when all owned and delegated resources are delegated
  // resources
  const indirect = Capability.match(everything, {
    subject: 'ucan:*',
    can,
  })
    .and(
      Delegation.match(delegation, {
        capability: everything,
        audience: authority,
        time,
      })
    )
    // ucan:* resource implies both own and delegated resources
    .and(
      // Issuer owns their DID resource and since `ucan:*` implies all
      // resources, it also implies the issuer DID. Which is why if the
      // subject matches the issuer we have a match.
      Delegation.issuedBy(delegation, subject)
        // Otherwise we need to match subject with one of the resources
        // in the proofs as those are re-delegated by `ucan:*` resource.
        .or(
          DB.match([delegation, 'ucan/proof', proof])
            .and(
              Capability.match(capability, {
                subject,
                can,
              })
            )
            .and(
              Delegation.match(proof, {
                capability,
                // In this instance account must be the audience of the
                // proof, as account is re-delegating it.
                audience: account,
                time,
              })
            )
        )
    )

  return direct.or(indirect)
}

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
