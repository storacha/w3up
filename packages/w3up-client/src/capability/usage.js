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
   * Required delegated capabilities:
   * - `usage/report`
   *
   * @param {import('../types.js').SpaceDID} space
   * @param {{ from: Date, to: Date }} period
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async report(space, period, options) {
    const out = await report(
      { agent: this.agent },
      { ...options, space, period }
    )
    /* c8 ignore next 7 */
    if (!out.ok) {
      throw new Error(`failed ${UsageCapabilities.report.can} invocation`, {
        cause: out.error,
      })
    }

    return out.ok
  }

  /**
   * Record egress data for the customer and served resource.
   *
   * Required delegated capabilities:
   * - `usage/record`
   *
   * @param {import('../types.js').SpaceDID} space
   * @param {API.EgressData} egressData
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async record(space, egressData, options) {
    const out = await record(
      { agent: this.agent },
      { ...options, space, egressData }
    )
    /* c8 ignore next 7 */
    if (!out.ok) {
      throw new Error(`failed ${UsageCapabilities.record.can} invocation`, {
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
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.UsageReportSuccess, API.UsageReportFailure>>}
 */
export const report = async (
  { agent },
  { space, period, nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(UsageCapabilities.report, {
    with: space,
    proofs,
    nonce,
    nb: {
      period: {
        from: Math.floor(period.from.getTime() / 1000),
        to: Math.ceil(period.to.getTime() / 1000),
      },
    },
  })
  return receipt.out
}

/**
 * Record egress data for the customer and served resource.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} options
 * @param {API.SpaceDID} options.space
 * @param {API.EgressData} options.egressData -
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.Unit, API.EgressRecordFailure>>}
 */
export const record = async (
  { agent },
  { space, egressData, nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(UsageCapabilities.record, {
    with: space,
    proofs,
    nonce,
    nb: {
      customer: egressData.customer,
      resourceCID: egressData.resourceCID,
      bytes: egressData.bytes,
      servedAt: Math.floor(new Date(egressData.servedAt).getTime() / 1000),
    },
  })
  return receipt.out
}
