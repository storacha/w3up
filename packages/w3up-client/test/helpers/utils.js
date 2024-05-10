import * as Server from '@ucanto/server'
import { UCAN } from '@web3-storage/capabilities'
import * as Types from '../../src/types.js'

export const validateAuthorization = () => ({ ok: {} })

/**
 * Utility function that creates a delegation from account to agent and an
 * attestation from service to proof it. Proofs can be used to invoke any
 * capability on behalf of the account.
 *
 * @param {object} input
 * @param {Types.UCAN.Signer<Types.AccountDID>} input.account
 * @param {Types.Signer<Types.DID>} input.service
 * @param {Types.Signer} input.agent
 */
export const createAuthorization = async ({ account, agent, service }) => {
  // Issue authorization from account DID to agent DID
  const authorization = await Server.delegate({
    issuer: account,
    audience: agent,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    expiration: Infinity,
  })

  const attest = await UCAN.attest
    .invoke({
      issuer: service,
      audience: agent,
      with: service.did(),
      nb: {
        proof: authorization.cid,
      },
      expiration: Infinity,
    })
    .delegate()

  return [authorization, attest]
}
