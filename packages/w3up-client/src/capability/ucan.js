import { UCAN } from '@web3-storage/capabilities'
import * as Result from '../result.js'
import * as Agent from '../agent.js'
import * as API from '../types.js'

/**
 * Revoke a delegation by CID.
 *
 * If the delegation was issued by this agent (and therefore is stored in the
 * delegation store) you can just pass the CID. If not, or if the current agent's
 * delegation store no longer contains the delegation, you MUST pass a chain of
 * proofs that proves your authority to revoke this delegation as `options.proofs`.
 *
 * @param {object} agent
 * @param {API.Signer} agent.issuer
 * @param {API.AgentData} agent.data
 * @param {API.ConnectionView<API.UCANProtocol>} agent.connection
 * @param {API.UCANLink} delegationCID
 * @param {object} [options]
 * @param {API.Delegation[]} [options.proofs]
 */
export const revoke = async (
  { issuer, data, connection },
  delegationCID,
  options = {}
) => {
  const additionalProofs = options.proofs ?? []
  // look for the identified delegation in the delegation store and the passed proofs
  const delegation = [
    ...Agent.selectIssuedDelegations(data),
    ...additionalProofs,
  ].find((delegation) => delegation.cid.equals(delegationCID))
  if (!delegation) {
    return Result.error(
      new Error(
        `could not find delegation ${delegationCID.toString()} - please include the delegation in options.proofs`
      )
    )
  }

  const invocation = await Agent.issueInvocation(
    { issuer, data, connection },
    UCAN.revoke,
    {
      // per https://github.com/web3-storage/w3up/blob/main/packages/capabilities/src/ucan.js#L38C6-L38C6 the resource here should be
      // the current issuer - using the space DID here works for simple cases but falls apart when a delegee tries to revoke a delegation
      // they have re-delegated, since they don't have "ucan/revoke" capabilities on the space
      with: issuer.did(),
      nb: {
        ucan: delegation.cid,
      },
      proofs: [delegation, ...additionalProofs],
    }
  )

  const receipt = await invocation.execute(connection)
  return receipt.out
}
