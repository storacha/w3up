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
   * Required delegated capabilities:
   * - `subscription/list`
   *
   * @param {import('@web3-storage/access').AccountDID} account
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  /* c8 ignore next */
  async list(account, options) {
    const out = await list({ agent: this.agent }, { ...options, account })
    /* c8 ignore next 8 */
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
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 */
export const list = async ({ agent }, { account, nonce, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(SubscriptionCapabilities.list, {
    with: account,
    proofs,
    nb: {},
    nonce,
  })
  return receipt.out
}
