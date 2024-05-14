import * as API from '../../src/types.js'
import { TasksStorage } from './tasks-storage.js'
import { ReceiptsStorage } from './receipts-storage.js'
import { Invocation } from '@ucanto/core'

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
    for (const invocation of message.invocations) {
      promises.push(this.invocations.put(invocation))
    }

    for (const receipt of message.receipts.values()) {
      promises.push(this.receipts.put(receipt))

      // Also index all the invocations that were scheduled as effects
      const fx = [
        ...receipt.fx.fork,
        ...(receipt.fx.join ? [receipt.fx.join] : []),
      ]

      for (const effect of fx.filter(Invocation.isInvocation)) {
        promises.push(this.invocations.put(effect))
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
