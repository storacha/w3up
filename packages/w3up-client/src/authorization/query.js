import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Capability from '../agent/capability.js'
import * as Delegation from '../agent/delegation.js'
import * as Text from '../agent/db/text.js'
import * as Attestation from '../agent/attestation.js'

export { Capability, Delegation, Text }

/**
 * @typedef {object} ProofSelector
 * @property {DB.Term<string>} can
 * @property {DB.Term<DB.Entity>} proof
 * @property {DB.Term<DB.Entity>} [attestation]
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
  /** @type {{proof: DB.Term<DB.Entity>, attestation: DB.Term<DB.Entity>, can: DB.Term<API.Ability>, need?: string }[]} */
  const proofs = need.length
    ? need.map((need) => ({
        proof: DB.link(),
        need,
        can: DB.string(),
        attestation: DB.link(),
      }))
    : [{ proof: DB.link(), can: DB.string(), attestation: DB.link() }]

  const where = proofs.map(({ proof, need, can, attestation }) => {
    const clause = match(proof, {
      subject,
      can,
      authority,
      time,
    })

    const attestations = DB.or(
      DB.not(DB.Constraint.glob(subject, 'did:mailto:*')),
      Attestation.match(attestation, { proof, time, audience: authority })
    )

    return (need ? clause.and(DB.glob(need, can)) : clause).and(attestations)
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
