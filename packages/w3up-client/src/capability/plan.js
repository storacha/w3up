import * as API from '../types.js'
import * as Plan from '@web3-storage/capabilities/plan'

/**
 * Gets the plan currently associated with the account.
 *
 * @param {{agent: API.Agent}} client
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

/**
 * Sets the plan currently associated with the account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.DID} options.product
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 */
export const set = async ({ agent }, { account, product, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(Plan.set, {
    with: account,
    nb: { product },
    proofs,
  })
  return receipt.out
}

/**
 * Sets the plan billing email currently associated with the account.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {string} options.email
 * @param {API.AccountDID} options.account
 * @param {API.Delegation[]} [options.proofs]
 */
export const setEmail = async ({ agent }, { account, email, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(Plan.setEmail, {
    with: account,
    nb: { email },
    proofs,
  })
  return receipt.out
}