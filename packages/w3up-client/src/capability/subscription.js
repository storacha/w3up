import { Subscription as SubscriptionCapabilities } from '@web3-storage/capabilities'
import * as API from '../types.js'
import { Base } from '../base.js'

/**
 * Client for interacting with the `subscription/*` capabilities.
 */
export class SubscriptionClient extends Base {
  /**
   * List subscriptions for the passed account.
   *
   * @param {import('@web3-storage/access').AccountDID} account
   */
  /* c8 ignore next */
  async list(account) {
    const out = await list({ agent: this.agent }, { account })
    /* c8 ignore next 6 */
    if (!out.ok) {
      throw new Error(
        `failed ${SubscriptionCapabilities.list.can} invocation`,
        {
          cause: out.error,
        }
      )
    }

    return out.ok
  }
}

/**
 * Gets subscriptions associated with the account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 */
export const list = async ({ agent }, { account, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(SubscriptionCapabilities.list, {
    with: account,
    proofs,
    nb: {},
  })
  return receipt.out
}
