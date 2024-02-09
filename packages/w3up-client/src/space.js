import * as Usage from './capability/usage.js'
import * as API from './types.js'
export * from './capability/space.js'

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 */
class SessionSpaces {
  /**
   * @param {API.Session<Protocol>} session
   */
  constructor(session) {
    this.session = session
  }
  list() {}
}

class SpaceView {
  constructor() {}
}

export class StorageUsage {
  #model

  /**
   * @param {Model} model
   */
  constructor(model) {
    this.#model = model
  }

  /**
   * Get the current usage in bytes.
   */
  async get() {
    const { agent } = this.#model
    const space = this.#model.id
    const now = new Date()
    const period = {
      // we may not have done a snapshot for this month _yet_, so get report
      // from last month -> now
      from: startOfLastMonth(now),
      to: now,
    }
    const result = await Usage.report(agent, { space, period })
    /* c8 ignore next */
    if (result.error) return result

    const provider = /** @type {API.ProviderDID} */ (agent.connection.id.did())
    const report = result.ok[provider]

    return {
      /* c8 ignore next */
      ok: report?.size.final == null ? undefined : BigInt(report.size.final),
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
