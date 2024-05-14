import * as API from '../../src/types.js'
import { TasksStorage } from './tasks-storage.js'
import { ReceiptsStorage } from './receipts-storage.js'
import { Invocation, Receipt } from '@ucanto/core'

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
    const blocks = new Map(
      [...message.iterateIPLDBlocks()].map((block) => [`${block.cid}`, block])
    )

    for (const invocation of message.invocations) {
      promises.push(this.invocations.put(invocation))

      // If this a conclude invocation, we do index receipt
      if (invocation.capabilities[0].can === 'ucan/conclude') {
        const { receipt: root } = Object(invocation.capabilities[0].nb)

        const receipt = root
          ? Receipt.view(
              {
                root,
                blocks,
              },
              null
            )
          : null

        if (receipt) {
          promises.push(this.receipts.put(receipt))

          if (Invocation.isInvocation(receipt.ran)) {
            promises.push(this.invocations.put(receipt.ran))
          }
        }
      }
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
