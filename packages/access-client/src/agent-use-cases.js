import { Agent as AccessAgent } from './agent.js'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/capabilities/access'

/**
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {Iterable<{ can: Ucanto.Ability }>} capabilities
 */
export async function requestAuthorization(access, account, capabilities) {
  const res = await access.invokeAndExecute(Access.authorize, {
    audience: access.connection.id,
    with: access.issuer.did(),
    nb: {
      iss: account.did(),
      att: [...capabilities],
    },
  })
  if (res?.error) {
    throw new Error('failed to authorize session', { cause: res })
  }
}
