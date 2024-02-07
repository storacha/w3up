import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Delegation from './delegation.js'
import * as Text from './db/text.js'
import * as Attestation from './attestation.js'

export { Attestation }

/**
 * Creates constraint on the `ucan` that will match only delegations
 * representing account logins. That is, it will match only the `ucan` that
 * delegates `*` capabilities on `constraints.subject` to the
 * `constraints.audience` and that are valid at `constraints.time`.
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<API.DID>} [constraints.account]
 * @param {DB.Term<API.DID>} constraints.audience
 * @param {DB.Term<API.UTCUnixTimestamp>} constraints.time
 * @returns {DB.Clause}
 */
export const match = (ucan, { account = DB.string(), audience, time }) => {
  const capability = DB.link()
  return Delegation.match(ucan, {
    capability: capability,
    audience,
    time,
  })
    .and(DB.match([capability, 'capability/with', 'ucan:*']))
    .and(DB.match([capability, 'capability/can', '*']))
    .and(DB.match([ucan, 'ucan/issuer', account]))
    .and(Text.match(account, { glob: 'did:mailto:*' }))
}
