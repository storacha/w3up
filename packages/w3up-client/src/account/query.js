import * as API from '../types.js'
import * as Text from '../agent/db/text.js'
import * as DB from 'datalogia'
import * as Authorization from '../authorization/query.js'

/**
 * @typedef {object} Match
 * @property {DB.Link} proof
 * @property {DB.Link} [attestation]
 * @property {API.DidMailto} account
 */

/**
 * @param {object} selector
 * @param {DB.Term<API.Ability>} [selector.can]
 * @param {DB.Term<API.DidMailto>} [selector.account]
 * @param {DB.Term<API.DID>} [selector.audience]
 * @param {DB.Term<DB.Link>} [selector.attestation]
 * @param {DB.Term<API.UTCUnixTimestamp>} [selector.time]
 * @returns {API.Query<{ account: DB.Term<API.DidMailto>; proof: DB.Term<DB.Link>, attestation: DB.Term<DB.Link> }>}
 */
export const query = ({
  time = Date.now() / 1000,
  account = DB.string(),
  attestation = DB.link(),
  ...selector
}) => {
  const proof = DB.link()
  return {
    select: {
      account,
      proof,
      attestation,
    },
    where: [match(proof, { account, attestation, ...selector })],
  }
}

/**
 * @typedef {object} Model
 * @property {API.DidMailto} id
 * @property {Map<string, API.Delegation>} proofs
 * @property {Map<string, API.Delegation>} attestations
 */

/**
 * Takes matches and builds up a map of models.
 *
 * @param {API.Database} db
 * @param {Match[]} matches
 * @returns {Map<API.DidMailto, Model>}
 */
export const select = (db, matches) => {
  /** @type {Map<API.DidMailto, Model>} */
  const selection = new Map()
  for (const match of matches) {
    const account = selection.get(match.account) ?? {
      id: match.account,
      proofs: new Map(),
      attestations: new Map(),
    }

    const proof = /** @type {{delegation: API.Delegation}} */ (
      db.proofs.get(String(match.proof))
    )
    account.proofs.set(proof.delegation.cid.toString(), proof.delegation)

    if (match.attestation) {
      const attestation = /** @type {{delegation: API.Delegation}} */ (
        db.proofs.get(String(match.attestation))
      )

      account.attestations.set(
        attestation.delegation.cid.toString(),
        attestation.delegation
      )
    }

    selection.set(account.id, account)
  }

  return selection
}

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<API.DidMailto>} [constraints.account]
 * @param {DB.Term<DB.Link>} [constraints.attestation]
 * @param {DB.Term<API.Ability>} [constraints.can]
 */
export const match = (
  ucan,
  {
    time = Date.now() / 1000,
    audience = DB.string(),
    account = DB.string(),
    attestation = DB.link(),
    can = DB.string(),
  }
) =>
  Authorization.match(ucan, {
    time,
    audience,
    subject: account,
    can,
    attestation,
  }).and(Text.match(account, { glob: 'did:mailto:*' }))
