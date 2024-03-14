import { Usage } from '@web3-storage/capabilities'
import * as API from '../types.js'
import * as Task from '../task.js'
import * as Agent from '../agent.js'
import * as Session from '../session.js'

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
export function* report(session, { space, period }) {
  const { proofs } = yield* Agent.authorize(session.agent, {
    subject: space,
    can: { 'usage/report': [] },
  })

  const task = Usage.report.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: space,
    proofs,
    nb: {
      period: {
        from: Math.floor(period.from.getTime() / 1000),
        to: Math.ceil(period.to.getTime() / 1000),
      },
    },
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * @param {API.Session<API.UsageProtocol>} session
 */
export function* get(session) {
  const space = /** @type {API.DIDKey} */ (session.agent.signer.did())
  const now = new Date()
  const period = {
    // we may not have done a snapshot for this month _yet_, so get report
    // from last month -> now
    from: startOfLastMonth(now),
    to: now,
  }

  const result = yield* Session.perform(report(session, { space, period }))

  const provider = /** @type {API.ProviderDID} */ (session.connection.id.did())
  const usage = result[provider]

  /* c8 ignore next */
  return BigInt(usage.size.final ?? -1)
}

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
   * @returns {Task.Invocation<bigint, API.UsageReportFailure | API.InvocationError>}
   */
  get() {
    return Task.perform(get(this.session))
  }

  /**
   * Get a usage report for the passed space in the given time period.
   *
   * @param {{from: Date, to: Date}} period
   */
  report(period) {
    const space = /** @type {API.DIDKey} */ (this.session.agent.signer.did())
    return Session.perform(report(this.session, { space, period }))
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
