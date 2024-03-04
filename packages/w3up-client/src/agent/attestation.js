import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Capability from './capability.js'
import * as Delegation from './delegation.js'

/**
 * Creates constraint for the `ucan` that will match only the ones that are
 *  attestations of `constraints.proof` issued on behalf of
 * `constraints.authority` to `constraints.audience` and that are valid
 * at `constraints.time`.
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<DB.Entity>} [constraints.capability]
 * @param {DB.Term<API.DID>} [constraints.subject]
 * @param {DB.Term<API.UTCUnixTimestamp>} constraints.time
 * @param {DB.Term<API.DID>} constraints.audience
 * @param {DB.Term<DB.Link>} constraints.proof
 */
export const match = (
  ucan,
  { capability = DB.link(), subject = DB.string(), audience, proof, time }
) =>
  Capability.match(capability, {
    subject,
    can: 'ucan/attest',
  })
    .and(DB.match([capability, 'capability/nb/proof', proof]))
    .and(
      Delegation.match(ucan, {
        capability,
        audience,
        time,
      })
    )
