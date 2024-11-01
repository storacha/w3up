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
   * Record egress data for a served resource.
   * It will execute the capability invocation to find the customer and then record the egress data for the resource.
   *
   * Required delegated capabilities:
   * - `usage/record`
   *
   * @param {object} egressData
   * @param {import('../types.js').SpaceDID} egressData.space
   * @param {API.UnknownLink} egressData.resource
   * @param {number} egressData.bytes
   * @param {string} egressData.servedAt
   * @param {API.ProviderDID} provider
   * @param {object} [options]
   * @param {string} [options.nonce]
   * @param {API.Delegation[]} [options.proofs]
   */
  async record(egressData, provider, options) {
    const out = await record(
      { agent: this.agent },
      { provider, ...egressData },
      { ...options }
    )
    /* c8 ignore next 5 */
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
 * Record egress data for a resource from a given space.
 *
 * @param {{agent: API.Agent}} client
 * @param {object} egressData
 * @param {API.ProviderDID} egressData.provider
 * @param {API.SpaceDID} egressData.space
 * @param {API.UnknownLink} egressData.resource
 * @param {number} egressData.bytes
 * @param {string} egressData.servedAt
 * @param {object} options
 * @param {string} [options.nonce]
 * @param {API.Delegation[]} [options.proofs]
 * @returns {Promise<API.Result<API.Unit, API.EgressRecordFailure>>}
 */
export const record = async (
  { agent },
  { provider, space, resource, bytes, servedAt },
  { nonce, proofs = [] }
) => {
  const receipt = await agent.invokeAndExecute(UsageCapabilities.record, {
    with: provider,
    proofs,
    nonce,
    nb: {
      space,
      resource,
      bytes,
      servedAt: Math.floor(new Date(servedAt).getTime() / 1000),
    },
  })
  return receipt.out
}
