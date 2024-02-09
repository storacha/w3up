import * as API from '../types.js'
import { Client } from './client.js'
import { list } from '../capability/subscription.js'
import * as Result from '../result.js'

/**
 * Client for interacting with the `subscription/*` capabilities.
 *
 * @extends {Client<API.W3Protocol>}
 */
export class SubscriptionClient extends Client {
  /**
   * List subscriptions for the passed account.
   *
   * @param {API.AccountDID} account
   */
  async list(account) {
    return Result.unwrap(await list(this.agent, { account }))
  }
}
