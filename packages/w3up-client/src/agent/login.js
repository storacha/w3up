import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Delegation from './delegation.js'
import * as Text from './db/text.js'
import * as Attestation from './attestation.js'

export { Attestation }

/**
 * @typedef {object} Match
 * @property {DB.Link} proof
 * @property {DB.Link} attestation
 * @property {API.DidMailto} account
 */

/**
 * Creates constraint on the `ucan` that will match only delegations
 * representing account logins. That is, it will match only the `ucan` that
 * delegates `*` capabilities on `constraints.subject` to the
 * `constraints.audience` and that are valid at `constraints.time`.
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.DID>} [constraints.account]
 * @param {DB.Term<API.DID>} constraints.authority
 * @param {DB.Term<API.UTCUnixTimestamp>} constraints.time
 * @returns {DB.Clause}
 */
export const match = (ucan, { account = DB.string(), authority, time }) => {
  const capability = DB.link()
  return Delegation.match(ucan, {
    capability: capability,
    audience: authority,
    time,
  })
    .and(DB.match([capability, 'capability/with', 'ucan:*']))
    .and(DB.match([capability, 'capability/can', '*']))
    .and(DB.match([ucan, 'ucan/issuer', account]))
    .and(Text.match(account, { glob: 'did:mailto:*' }))
}

/**
 * @param {object} selector
 * @param {API.TextConstraint} selector.authority
 * @param {API.TextConstraint} [selector.provider] - Attestation provider
 * @param {API.TextConstraint} [selector.account]
 * @param {API.UTCUnixTimestamp} [selector.time]
 * @returns {API.Query<{ account: DB.Term<API.DidMailto>; proof: DB.Term<DB.Link>, attestation: DB.Term<DB.Link> }>}
 */
export const query = ({ time = Date.now() / 1000, ...selector }) => {
  const account = DB.string()
  const authority = DB.string()
  const proof = DB.link()
  const attestation = DB.link()
  const provider = DB.string()
  return {
    select: {
      account,
      proof,
      attestation,
    },
    where: [
      match(proof, { account, authority, time }),
      Attestation.match(attestation, {
        subject: provider,
        audience: authority,
        time,
        proof,
      }),
      Text.match(authority, selector.authority),
      Text.match(account, selector.account ?? { glob: 'did:mailto:*' }),
      Text.match(provider, selector.provider ?? { glob: 'did:web:*' }),
    ],
  }
}

/**
 * Takes matches and builds up a map of logins.
 *
 * @param {API.Database} db
 * @param {Match[]} matches
 * @returns {Map<string, Login>}
 */
export const select = (db, matches) => {
  const logins = new Map()
  for (const { account, ...match } of matches) {
    const proof = /** @type {{delegation: API.Delegation}} */ (
      db.proofs.get(String(match.proof))
    )

    const attestation = /** @type {{delegation: API.Delegation}} */ (
      db.proofs.get(String(match.attestation))
    )

    const login = logins.get(account) ?? from({ account })

    login.proofs.set(proof.delegation.cid.toString(), proof.delegation)
    login.attestations.set(
      attestation.delegation.cid.toString(),
      attestation.delegation
    )
    logins.set(account, login)
  }

  return logins
}

/**
 * @param {object} source
 * @param {API.DidMailto} source.account
 * @param {Map<string, API.Delegation>} [source.proofs]
 * @param {Map<string, API.Delegation>} [source.attestations]
 */
export const from = ({
  account,
  proofs = new Map(),
  attestations = new Map(),
}) => new Login({ account, proofs, attestations })

class Login {
  /**
   * @param {object} source
   * @param {API.DidMailto} source.account
   * @param {Map<string, API.Delegation>} source.proofs
   * @param {Map<string, API.Delegation>} source.attestations
   */
  constructor(source) {
    this.model = source
  }

  get id() {
    return this.model.account
  }

  get attestations() {
    return this.model.attestations
  }
  get proofs() {
    return this.model.proofs
  }
}
