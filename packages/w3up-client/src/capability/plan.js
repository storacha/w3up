import * as API from '../types.js'
import * as Plan from '@web3-storage/capabilities/plan'

/**
 * Gets the plan currently associated with the account.
 *
 * @param {{agent: API.AgentView<API.W3Protocol>}} client
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 */
export const get = async ({ agent }, { account, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(Plan.get, {
    with: account,
    proofs,
  })
  return receipt.out
}
