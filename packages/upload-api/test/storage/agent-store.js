import * as API from '../../src/types.js'
import { TasksStorage } from './tasks-storage.js'
import { ReceiptsStorage } from './receipts-storage.js'
import * as AgentMessage from '../../src/utils/agent-message.js'

export const memory = () => new AgentStore()

/**
 * @implements {API.AgentStore}
 */
class AgentStore {
  constructor() {
    this.invocations = new TasksStorage()
    this.receipts = new ReceiptsStorage()
  }
  get messages() {
    return this
  }

  /**
   * @param {API.AgentMessage} message
   * @returns {Promise<API.Result<API.Unit, API.WriteError<API.AgentMessage>>>}
   */
  async write(message) {
    const promises = []
    for (const { invocation, receipt } of AgentMessage.iterate(message)) {
      if (invocation) {
        promises.push(this.invocations.put(invocation))
      }
      if (receipt) {
        promises.push(this.receipts.put(receipt))
      }
    }

    const results = await Promise.all(promises)
    const failure = results.find((result) => result.error)

    return failure?.error
      ? {
          error: new WriteError({
            payload: message,
            writer: this,
            cause: failure.error,
          }),
        }
      : { ok: {} }
  }
}

/**
 * @template T
 * @implements {API.WriteError<T>}
 */
class WriteError extends Error {
  name = /** @type {const} */ ('WriteError')
  /**
   * @param {object} input
   * @param {Error} input.cause
   * @param {T} input.payload
   * @param {API.Writer<T>} input.writer
   */
  constructor({ cause, payload, writer }) {
    super(`Write to store has failed: ${cause}`)
    this.cause = cause
    this.payload = payload
    this.writer = writer
  }
}
