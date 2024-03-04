import * as API from './types.js'
import * as Plan from '@web3-storage/capabilities/plan'
import * as Authorization from './authorization/query.js'

/**
 * Gets the plan currently associated with the account.
 *
 * @param {API.Session<API.PlanProtocol>} session
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 */
export const get = async (session, { account, proofs = [] }) => {
  const auth = Authorization.get(session.agent.db, {
    can: { 'plan/get': [] },
    authority: session.agent.did(),
    subject: account,
  })

  if (auth.error) {
    return auth
  }

  const { out: result } = await Plan.get
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: account,
      proofs: auth.ok.proofs,
    })
    .execute(session.connection)

  return result
}
