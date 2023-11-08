import { Subscription as SubscriptionCapabilities } from '@web3-storage/capabilities'
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
  async list(account) {
    const conf = await this._invocationConfig([SubscriptionCapabilities.list.can])

    const result = await SubscriptionCapabilities.list
      .invoke({
        issuer: conf.issuer,
        audience: conf.audience,
        with: account,
        proofs: conf.proofs,
        nb: {},
      })
      .execute(this._serviceConf.access)

    if (!result.out.ok) {
      throw new Error(`failed ${SubscriptionCapabilities.list.can} invocation`, {
        cause: result.out.error,
      })
    }

    return result.out.ok
  }
}
