import { Usage } from '@web3-storage/capabilities'
import * as API from '../types.js'

export { Usage }

/**
 * Get a usage report for the period.
 *
 * @param {API.AgentView<API.UploadService>} agent
 * @param {object} options
 * @param {API.SpaceDID} options.space
 * @param {{ from: Date, to: Date }} options.period
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.UsageReportSuccess, API.UsageReportFailure>>}
 */
export const report = async (agent, { space, period, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(Usage.report, {
    with: space,
    proofs,
    nb: {
      period: {
        from: Math.floor(period.from.getTime() / 1000),
        to: Math.ceil(period.to.getTime() / 1000),
      },
    },
  })
  return receipt.out
}
