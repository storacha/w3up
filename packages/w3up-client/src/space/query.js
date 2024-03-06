import * as API from '../types.js'
import * as Delegation from '../agent/delegation.js'
import * as Text from '../agent/db/text.js'
import * as DB from 'datalogia'
import * as Authorization from '../authorization/query.js'
import { optional } from '../agent/db.js'

/**
 * @param {object} constraints
 * @param {typeof match | typeof implicit | typeof explicit} [constraints.match]
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<API.DIDKey>} [constraints.space]
 * @param {DB.Term<API.Ability>} [constraints.can]
 * @param {DB.Term<string>} [constraints.name]
 * @param {boolean} [constraints.implicit]
 * @returns {API.Query<{ proof: DB.Term<DB.Entity>; space: DB.Term<API.DIDKey>; name?: DB.Term<string> }>}
 */
export const query = ({
  space = DB.string(),
  name = DB.string(),
  ...constraints
}) => {
  const ucan = DB.link()
  return {
    select: {
      space,
      name,
      proof: ucan,
    },
    where: [
      (constraints.match ?? match)(ucan, { name, space, ...constraints }),
    ],
  }
}

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {DB.Term<string>} name
 */
export const named = (ucan, name) =>
  optional(Delegation.hasMeta(ucan, { 'meta/space/name': name }))

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<string>} [constraints.space]
 * @param {DB.Term<API.Ability>} [constraints.can]
 * @param {DB.Term<string>} [constraints.name]
 */
export const explicit = (
  ucan,
  {
    time = Date.now() / 1000,
    audience = DB.string(),
    space = DB.string(),
    can = DB.string(),
    name = DB.string(),
  }
) => {
  return DB.and(
    Authorization.delegates(ucan, {
      audience,
      can,
      subject: space,
      time,
    }),
    named(ucan, name),
    Text.match(space, { glob: 'did:key:*' })
  )
}

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<string>} [constraints.space]
 * @param {DB.Term<API.Ability>} [constraints.can]
 * @param {DB.Term<string>} [constraints.name]
 */
export const match = (
  ucan,
  {
    time = Date.now() / 1000,
    audience = DB.string(),
    space = DB.string(),
    can = DB.string(),
    name = DB.string(),
  }
) => {
  const proof = DB.link()
  return DB.or(
    // It may be a an explicit delegation
    DB.and(
      Authorization.delegates(ucan, {
        audience,
        can,
        subject: space,
        time,
      }),
      named(ucan, name)
    ),
    // Or it could be an implicit delegation issued by the space
    DB.and(
      Delegation.forwards(ucan, { audience, time }),
      Delegation.issuedBy(ucan, space),
      named(ucan, name)
    ),
    // or it could be an delegation that forwards explicit proof
    DB.and(
      Delegation.forwards(ucan, { audience, time }),
      Delegation.hasProof(ucan, proof),
      Authorization.delegates(proof, { subject: space, time }),
      named(proof, name)
    )
  ).and(Text.match(space, { glob: 'did:key:*' }))
}

/**
 * @param {DB.Term<DB.Link>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<string>} [constraints.name]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<API.DID>} [constraints.account]
 * @param {DB.Term<API.DID>} [constraints.space]
 * @param {DB.Term<string>} [constraints.name]
 */
export const implicit = (
  ucan,
  {
    time = Date.now() / 1000,
    audience = DB.string(),
    space = DB.string(),
    name = DB.string(),
  }
) => {
  const proof = DB.link()
  return DB.and(
    Delegation.forwards(ucan, { audience, time }),
    Delegation.hasProof(ucan, proof),
    Authorization.delegates(proof, { subject: space, time }),
    Text.match(space, { glob: 'did:key:*' }),
    named(proof, name)
  )
}
