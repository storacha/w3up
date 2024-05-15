import { Base } from '../base.js'
import * as API from '../types.js'
import * as Plan from '@web3-storage/capabilities/plan'

export class PlanClient extends Base {
  /**
   *
   * @param {import('@web3-storage/access').AccountDID} account
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async get(account, options) {
    const out = await get({ agent: this.agent }, { ...options, account })

    if (!out.ok) {
      throw new Error(`failed ${Plan.get.can} invocation`, {
        cause: out.error,
      })
    }
    return out.ok
  }

  /**
   *
   * @param {API.AccountDID} account
   * @param {API.DID} product
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async set(account, product, options) {
    const out = await set(
      { agent: this.agent },
      { ...options, account, product }
    )
    if (!out.ok) {
      throw new Error(`failed ${Plan.set.can} invocation`, {
        cause: out.error,
      })
    }
    return out.ok
  }

  /**
   *
   * @param {API.AccountDID} account
   * @param {string} returnURL
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async createAdminSession(account, returnURL, options) {
    const out = await createAdminSession(
      { agent: this.agent },
      { ...options, account, returnURL }
    )
    if (!out.ok) {
      throw new Error(`failed ${Plan.createAdminSession.can} invocation`, {
        cause: out.error,
      })
    }
    return out.ok
  }
}

/**
 * Gets the plan currently associated with the account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 */
export const get = async ({ agent }, { account, nonce, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(Plan.get, {
    with: account,
    proofs,
    nonce,
  })
  return receipt.out
}

/**
 * Sets the plan currently associated with the account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.DID} options.product
 * @param {API.AccountDID} options.account
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 */
export const set = async (
  { agent },
  { account, product, nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(Plan.set, {
    with: account,
    nb: { product },
    nonce,
    proofs,
  })
  return receipt.out
}

/**
 * Creates an admin session for the given account.
 *
 * Returns a URL that a user can resolve to enter the
 * admin billing portal for this account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.AccountDID} options.account
 * @param {string} options.returnURL
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 */
export const createAdminSession = async (
  { agent },
  { account, returnURL, nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(Plan.createAdminSession, {
    with: account,
    proofs,
    nonce,
    nb: {
      returnURL,
    },
  })
  return receipt.out
}
