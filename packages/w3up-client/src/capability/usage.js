import { Usage as UsageCapabilities } from '@web3-storage/capabilities'
import * as API from '../types.js'
import { Base } from '../base.js'

/**
 * Client for interacting with the `usage/*` capabilities.
 */
export class UsageClient extends Base {
  /**
   * Get a usage report for the passed space in the given time period.
   *
   * @param {import('../types.js').SpaceDID} space
   * @param {{ from: Date, to: Date }} period
   */
  async report(space, period) {
    const out = await report({ agent: this.agent }, { space, period })
    if (!out.ok) {
      throw new Error(`failed ${UsageCapabilities.report.can} invocation`, {
        cause: out.error,
      })
    }

    return out.ok
  }
}

/**
 * Get a usage report for the period.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.SpaceDID} options.space
 * @param {{ from: Date, to: Date }} options.period
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.UsageReportSuccess, API.UsageReportFailure>>}
 */
export const report = async ({ agent }, { space, period, proofs = [] }) => {
  const receipt = await agent.invokeAndExecute(UsageCapabilities.report, {
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
