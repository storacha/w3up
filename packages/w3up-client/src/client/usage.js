import { report, Usage } from '../capability/usage.js'
import { Client } from './client.js'
import * as API from '../types.js'

/**
 * Client for interacting with the `usage/*` capabilities.
 *
 * @extends {Client<API.UploadService>}
 */
export class UsageClient extends Client {
  /**
   * Get a usage report for the passed space in the given time period.
   *
   * @param {API.SpaceDID} space
   * @param {{ from: Date, to: Date }} period
   */
  async report(space, period) {
    const out = await report(this.agent, { space, period })
    if (!out.ok) {
      throw new Error(`failed ${Usage.report.can} invocation`, {
        cause: out.error,
      })
    }

    return out.ok
  }
}
