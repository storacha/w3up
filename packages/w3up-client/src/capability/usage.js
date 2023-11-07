import { Usage as UsageCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `usage/*` capabilities.
 */
export class UsageClient extends Base {
  /**
   * Get a usage report for the given time period.
   *
   * @param {{ from: Date, to: Date }} period
   * @param {object} [options]
   * @param {import('../types.js').SpaceDID} [options.space] Obtain usage for a different space.
   */
  async report(period, options) {
    const conf = await this._invocationConfig([UsageCapabilities.report.can])

    const result = await UsageCapabilities.report
      .invoke({
        issuer: conf.issuer,
        /* c8 ignore next */
        audience: conf.audience,
        with: options?.space ?? conf.with,
        proofs: conf.proofs,
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
