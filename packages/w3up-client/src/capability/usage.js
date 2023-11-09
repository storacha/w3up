import { Usage as UsageCapabilities } from '@web3-storage/capabilities'
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
    const result = await UsageCapabilities.report
      .invoke({
        issuer: this._agent.issuer,
        audience: this._serviceConf.upload.id,
        with: space,
        proofs: this._agent.proofs([{
          can: UsageCapabilities.report.can,
          with: space
        }]),
        nb: {
          period: {
            from: Math.floor(period.from.getTime() / 1000),
            to: Math.floor(period.to.getTime() / 1000),
          },
        },
      })
      .execute(this._serviceConf.upload)

    if (!result.out.ok) {
      throw new Error(`failed ${UsageCapabilities.report.can} invocation`, {
        cause: result.out.error,
      })
    }

    return result.out.ok
  }
}
