import pRetry from 'p-retry'
import * as API from '../bindings.js'

/**
 *
 * @param {object} input
 * @param {URL} input.url
 * @param {string} [input.auth]
 */
export const connect = (input) => new UCANLog(input)

export const debug = () => new UCANLogDebug()

/**
 * @implements {API.UCANLog}
 */
class UCANLog {
  /**
   * @param {object} input
   * @param {URL} input.url
   * @param {string} [input.auth]
   */
  constructor({ url, auth }) {
    this.url = url
    this.auth = auth
  }
  /**
   * @param {Uint8Array} car
   */
  async logInvocations(car) {
    await pRetry(
      () =>
        fetch(this.url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${this.auth}`,
            'Content-Type': 'application/invocations+car',
          },
          body: car,
        }),
      {
        retries: 10,
      }
    )
  }
  /**
   * @param {API.ReceiptBlock} receipt
   */
  async logReceipt(receipt) {
    try {
      await pRetry(
        () =>
          fetch(this.url, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${this.auth}`,
              'Content-Type': 'application/receipt+dag-cbor',
            },
            body: receipt.bytes,
          }),
        {
          retries: 10,
        }
      )
    } catch (cause) {
      throw new Error(
        `Failed to log receipt for invocation ${receipt.data.ran}: ${cause}`,
        {
          cause,
        }
      )
    }
  }
}

/**
 * @implements {API.UCANLog}
 */
class UCANLogDebug {
  /**
   * @param {Uint8Array} car
   */
  async logInvocations(car) {
    try {
      // @ts-expect-error
      globalThis.ucanlog.invocations.push(car)
    } catch {}
  }
  /**
   * @param {API.ReceiptBlock} receipt
   */
  async logReceipt(receipt) {
    try {
      // @ts-expect-error
      globalThis.ucanlog.receipts.push(receipt)
    } catch (cause) {
      throw new Error(
        `Failed to log receipt for invocation ${receipt.data.ran}: ${cause}`
      )
    }
  }
}
