import * as Provider from '@web3-storage/capabilities/provider'
import * as API from '../types.js'

export const { Provider: ProviderDID, AccountDID } = Provider

/**
 * Provisions specified `space` with the specified `account`. It is expected
 * that delegation from the account authorizing agent is either stored in the
 * agent proofs or provided explicitly.
 *
 * @param {API.AgentView<API.AccessService>} agent
 * @param {object} input
 * @param {API.AccountDID} input.account - Account provisioning the space.
 * @param {API.SpaceDID} input.consumer - Space been provisioned.
 * @param {API.ProviderDID} [input.provider] - Provider been provisioned.
 * @param {API.Delegation[]} [input.proofs] - Delegation from the account
 * authorizing agent to call `provider/add` capability.
 */
export const add = async (
  agent,
  {
    account,
    consumer,
    provider = /** @type {API.ProviderDID} */ (agent.connection.id.did()),
    proofs,
  }
) => {
  if (!ProviderDID.is(provider)) {
    throw new Error(
      `Unable to determine provider from agent.connection.id did ${provider}. expected a did:web:`
    )
  }

  const { out } = await agent.invokeAndExecute(Provider.add, {
    with: account,
    nb: {
      provider,
      consumer,
    },
    proofs,
  })

  return out
}
