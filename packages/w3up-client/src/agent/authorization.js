import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Capability from './capability.js'
import * as Delegation from './delegation.js'
import * as Text from './db/text.js'

/**
 * Creates query that select set of proofs that would allow the
 * `selector.audience` to invoke abilities described in `selector.can` on the
 * `selector.subject` when time is `selector.time`.
 *
 * @param {object} selector
 * @param {API.TextConstraint} selector.audience
 * @param {API.TextConstraint} selector.subject
 * @param {API.Can} selector.can
 * @param {API.UTCUnixTimestamp} selector.time
 */
export const query = (selector) => {
  const subject = DB.string()
  const audience = DB.string()
  const abilities = Object.keys(selector.can)
  const proofs = Object.fromEntries(abilities.map((can) => [can, DB.link()]))

  return {
    select: {
      ...proofs,
      subject,
      audience,
    },
    where: [
      ...Object.entries(proofs).flatMap(([can, proof]) => {
        const capability = DB.link()
        return [
          Capability.match(capability, {
            subject,
            can,
          }),
          Delegation.match(proof, {
            capability,
            audience,
            time: selector.time,
          }),
        ]
      }),
      Text.match(audience, selector.audience),
      Text.match(subject, selector.subject),
    ],
  }
}
