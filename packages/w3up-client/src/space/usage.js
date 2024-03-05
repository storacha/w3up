import { Usage } from '@web3-storage/capabilities'
import * as API from '../types.js'
import * as Task from '../task.js'
import * as Agent from '../agent.js'

/**
 * @param {API.Session<API.UsageProtocol>} session
 * @returns
 */
export const view = (session) => new UsageSession(session)

/**
 * Get a usage report for the period.
 *
 * @param {API.Session<API.UsageProtocol>} session
 * @param {object} options
 * @param {API.SpaceDID} options.space
 * @param {{ from: Date, to: Date }} options.period
 * @param {API.Delegation[]} [options.proofs]
 */
export const report = async (session, { space, period }) =>
  Task.try(function* () {
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

/**
 * @implements {API.SpaceUsageView}
 */
class UsageSession {
  /**
   * @param {API.Session<API.UsageProtocol>} session
   */
  constructor(session) {
    this.session = session
  }

  /**
   * @returns {Promise<API.Result<bigint, API.UsageReportFailure | API.InvocationError>>}
   */
  async get() {
    const space = /** @type {API.DIDKey} */ (this.session.agent.signer.did())
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
      ok: BigInt(usage.size.final ?? -1),
    }
  }

  /**
   * Get a usage report for the passed space in the given time period.
   *
   * @param {{from: Date, to: Date}} period
   * @returns {Promise<API.Result<API.UsageReportSuccess, API.AccessDenied | API.UsageReportFailure | API.InvocationError>>}
   */
  async report(period) {
    const space = /** @type {API.DIDKey} */ (this.session.agent.signer.did())
    return report(this.session, { space, period })
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
