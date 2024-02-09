import { Subscription } from '@web3-storage/capabilities'
import * as Result from '../result.js'
import * as API from '../types.js'
import { issueInvocation } from '../agent.js'

export { Subscription }

/**
 * Gets subscriptions associated with the account.
 *
 * @param {API.AgentView<API.W3Protocol>} agent
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.SubscriptionListSuccess, Error>>}
 */
export const list = async (agent, { account, proofs = [] }) => {
  const task = await issueInvocation(agent, Subscription.list, {
    with: account,
    proofs,
    nb: {},
  })

  const { out } = await task.execute(agent.connection)

  if (out.error) {
    return Result.error(
      new Error(`failed ${Subscription.list.can} invocation`, {
        cause: out.error,
      })
    )
  }

  return out
}
