import * as API from '../types.js'
import * as DB from '../agent/db.js'
import * as Query from './query.js'

/**
 * @param {API.Authorization} model
 */
export const from = (model) => {
  const db = DB.from(model)

  return new Authorization({
    authority: model.authority,
    subject: model.subject,
    can: model.can,
    db,
  })
}

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
      ok: from({
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
    Query.query({
      can,
      subject,
      authority,
      time,
    })
  ).map((match) => select(db, match))

/**
 * @param {API.Database} db
 * @param {DB.InferBindings<Query.Selector>} match
 */
export const select = (db, { authority, subject, proofs }) => {
  // query engine will provide proof for each requested capability, so we may
  // have duplicates here, which we prune.
  const [, ...keys] = new Set([
    '',
    ...new Set(proofs.map(({ proof }) => String(proof))),
    ...proofs.map(({ attestation }) => `${attestation ?? ''}`),
  ])

  return from({
    authority: /** @type {API.DID} */ (authority),
    subject: /** @type {API.SpaceDID} */ (subject),
    can: Object.fromEntries(proofs.map(({ can, need }) => [need ?? can, []])),
    // Dereference proofs from the store.
    proofs: keys.map(
      ($) => /** @type {API.Delegation} */ (db.proofs.get($)?.delegation)
    ),
  })
}

class AccessDenied extends Error {
  name = /** @type {const} */ ('AccessDenied')
}

/**
 *
 * @param {Authorization} authorization
 * @param {object} access
 * @param {API.Can} access.can
 */
export const authorize = (authorization, { can }) => {
  get(authorization.model.db, {
    authority: authorization.authority,
    subject: authorization.subject,
    can,
  })
}

/**
 * @typedef {object} Model
 * @property {API.SpaceDID} subject
 * @property {API.Delegation[]} proofs
 * @property {API.DID} authority
 */
class Authorization {
  /**
   * @param {object} model
   * @param {API.Can} model.can
   * @param {API.Database} model.db
   * @param {API.DID} model.authority
   * @param {API.DID} model.subject
   */
  constructor(model) {
    this.model = model
  }
  get can() {
    return this.model.can
  }
  get proofs() {
    return [...this]
  }
  *[Symbol.iterator]() {
    for (const { delegation } of this.model.db.proofs.values()) {
      yield delegation
    }
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
