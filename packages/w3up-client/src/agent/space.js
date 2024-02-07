import * as API from '../types.js'
import * as Delegation from './delegation.js'
import * as Capability from './capability.js'
import * as Text from './db/text.js'
import * as DB from 'datalogia'

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
  subject = { like: '%' },
  audience = { like: '%' },
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
      ...Object.entries(proofs).flatMap(([can, delegation]) => {
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
              })
            ),
        ]
      }),
      Text.match(delegate, audience),
      Text.match(space, subject),
      Text.match(accountPrincipal, account),
    ],
  }
}
