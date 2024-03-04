import { Usage } from '@web3-storage/capabilities'
import * as API from '../types.js'
import * as Task from '../task.js'
import * as Agent from '../agent.js'

/**
 * @param {API.SharedSpaceSession<API.UsageProtocol>} session
 * @returns
 */
export const view = (session) => new UsageSession(session)

/**
 * Get a usage report for the period.
 *
 * @param {API.SharedSpaceSession<API.UsageProtocol>} session
 * @param {object} options
 * @param {API.SpaceDID} options.space
 * @param {{ from: Date, to: Date }} options.period
 * @param {API.Delegation[]} [options.proofs]
 */
export const report = async (session, { space, period, proofs = [] }) =>
  Task.execute(function* () {
    const auth = yield* Task.join(
      Agent.authorize(session.agent, {
        subject: space,
        can: { 'usage/report': [] },
      })
    )

    const receipt = yield* Task.wait(
      Usage.report
        .invoke({
          issuer: session.agent.signer,
          audience: session.connection.id,
          with: space,
          proofs: auth.proofs,
          nb: {
            period: {
              from: Math.floor(period.from.getTime() / 1000),
              to: Math.ceil(period.to.getTime() / 1000),
            },
          },
        })
        .execute(session.connection)
    )

    return receipt.out
  })

class UsageSession {
  /**
   * @param {API.SharedSpaceSession<API.UsageProtocol>} session
   */
  constructor(session) {
    this.session = session
  }
  /**
   * @param {object} options
   * @param {API.SpaceDID} options.space
   * @param {{ from: Date, to: Date }} options.period
   * @param {API.Delegation[]} [options.proofs]
   */
  report(options) {
    return report(this.session, options)
  }

  async get() {
    const space = /** @type {API.DIDKey} */ (this.session.did())
    const now = new Date()
    const period = {
      // we may not have done a snapshot for this month _yet_, so get report
      // from last month -> now
      from: startOfLastMonth(now),
      to: now,
    }

    const result = await report(this.session, { space, period })

    /* c8 ignore next */
    if (result.error) return result

    const provider = /** @type {API.ProviderDID} */ (
      this.session.connection.id.did()
    )
    const usage = result.ok[provider]

    return {
      /* c8 ignore next */
      ok: usage?.size.final == null ? undefined : BigInt(usage.size.final),
    }
  }
}

/** @param {string|number|Date} now */
const startOfMonth = (now) => {
  const d = new Date(now)
  d.setUTCDate(1)
  d.setUTCHours(0)
  d.setUTCMinutes(0)
  d.setUTCSeconds(0)
  d.setUTCMilliseconds(0)
  return d
}

/** @param {string|number|Date} now */
const startOfLastMonth = (now) => {
  const d = startOfMonth(now)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d
}
