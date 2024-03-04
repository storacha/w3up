import * as API from '../types.js'
import * as Delegation from '../agent/delegation.js'
import * as Capability from '../agent/capability.js'
import * as Text from '../agent/db/text.js'
import * as DB from 'datalogia'
import * as Authorization from '../authorization/query.js'
import { optional } from '../agent/db.js'

/**
 * @param {object} constraints
 * @param {typeof match | typeof implicit | typeof explicit} [constraints.match]
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.authority]
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
 * @param {DB.Term<API.DID>} [constraints.authority]
 * @param {DB.Term<string>} [constraints.space]
 * @param {DB.Term<API.Ability>} [constraints.can]
 * @param {DB.Term<string>} [constraints.name]
 */
export const explicit = (
  ucan,
  {
    time = Date.now() / 1000,
    authority = DB.string(),
    space = DB.string(),
    can = DB.string(),
    name = DB.string(),
  }
) => {
  return DB.and(
    Authorization.explicit(ucan, { authority, can, subject: space, time }),
    named(ucan, name),
    Text.match(space, { glob: 'did:key:*' })
  )
}

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.authority]
 * @param {DB.Term<string>} [constraints.space]
 * @param {DB.Term<API.Ability>} [constraints.can]
 * @param {DB.Term<string>} [constraints.name]
 */
export const match = (
  ucan,
  {
    time = Date.now() / 1000,
    authority = DB.string(),
    space = DB.string(),
    can = DB.string(),
    name = DB.string(),
  }
) => {
  const proof = DB.link()
  return DB.or(
    // It may be a an explicit delegation
    DB.and(
      Authorization.explicit(ucan, { authority, can, subject: space, time }),
      named(ucan, name)
    ),
    // Or it could be an implicit delegation issued by the space
    DB.and(
      Delegation.forwards(ucan, { audience: authority, time }),
      Delegation.issuedBy(ucan, space),
      named(ucan, name)
    ),
    // or it could be an delegation that forwards explicit proof
    DB.and(
      Delegation.forwards(ucan, { audience: authority, time }),
      Delegation.hasProof(ucan, proof),
      Authorization.explicit(proof, { subject: space, time }),
      named(proof, name)
    )
  ).and(Text.match(space, { glob: 'did:key:*' }))
}

/**
 * @param {DB.Term<DB.Link>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<string>} [constraints.name]
 * @param {DB.Term<API.DID>} [constraints.authority]
 * @param {DB.Term<API.DID>} [constraints.account]
 * @param {DB.Term<API.DID>} [constraints.space]
 * @param {DB.Term<string>} [constraints.name]
 */
export const implicit = (
  ucan,
  {
    time = Date.now() / 1000,
    authority = DB.string(),
    space = DB.string(),
    name = DB.string(),
  }
) => {
  const proof = DB.link()
  return DB.and(
    Delegation.forwards(ucan, { audience: authority, time }),
    Delegation.hasProof(ucan, proof),
    Authorization.explicit(proof, { subject: space, time }),
    Text.match(space, { glob: 'did:key:*' }),
    named(proof, name)
  )
}

/**
 * Creates a query that selects delegations to the `selector.audience` that
 * delegate `selector.can` access on the `selector.subject` space. It only
 * includes direct delegations and not the ones that have been re-delegated.
 *
 * @param {object} selector
 * @param {API.TextConstraint} selector.audience
 * @param {API.TextConstraint} [selector.subject]
 * @param {API.Can} [selector.can]
 * @param {API.UTCUnixTimestamp} [selector.time]
 */
export const direct = ({
  subject = { glob: '*' },
  audience,
  time = Date.now() / 1000,
  can = {},
}) => {
  const abilities = Object.keys(can)
  const proofs = Object.fromEntries(abilities.map((can) => [can, DB.link()]))
  const space = DB.string()

  const delegate = DB.string()

  return {
    select: {
      ...proofs,
      subject: space,
      audience: delegate,
    },
    where: [
      ...Object.entries(proofs).flatMap(([can, delegation]) => {
        const capability = DB.link()
        return [
          Capability.match(capability, {
            subject: space,
            can,
          }).and(
            Delegation.match(delegation, {
              capability,
              audience: delegate,
              time: time,
            })
          ),
        ]
      }),
      Text.match(delegate, audience),
      Text.match(space, subject),
    ],
  }
}

/**
 * @param {object} selector
 * @param {API.TextConstraint} [selector.audience]
 * @param {API.TextConstraint} [selector.subject]
 * @param {API.Can} [selector.can]
 * @param {API.TextConstraint} [selector.account]
 * @param {API.UTCUnixTimestamp} [selector.time]
 */
export const indirect = ({
  subject = { glob: '*' },
  audience = { glob: '*' },
  time = Date.now() / 1000,
  account = { glob: 'did:mailto:*' },
  can = { '*': [] },
}) => {
  const abilities = Object.keys(can)
  const proofs = Object.fromEntries(abilities.map((can) => [can, DB.link()]))
  const space = DB.string()

  const delegate = DB.string()
  const accountPrincipal = DB.string()

  return {
    select: {
      ...proofs,
      subject: space,
      audience: delegate,
      account: accountPrincipal,
    },
    where: [
      ...Object.entries(proofs).flatMap(([need, delegation]) => {
        const can = DB.string()
        const login = DB.link()
        const proof = DB.link()
        const capability = DB.link()
        return [
          Capability.match(login, {
            subject: 'ucan:*',
            can: '*',
          })
            .and(
              Delegation.match(delegation, {
                capability: login,
                audience: delegate,
                time: time,
              })
            )
            .and(Delegation.issuedBy(delegation, accountPrincipal))
            .and(DB.match([delegation, 'ucan/proof', proof]))
            .and(
              Delegation.match(proof, {
                capability,
                audience: accountPrincipal,
                time: time,
              })
            )
            .and(
              Capability.match(capability, {
                subject: space,
                can,
              }).and(DB.glob(need, can))
            ),
        ]
      }),
      Text.match(delegate, audience),
      Text.match(space, subject),
      Text.match(accountPrincipal, account),
    ],
  }
}
