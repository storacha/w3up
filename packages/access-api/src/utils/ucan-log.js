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
    try {
      const res = await fetch(`${this.url}/ucan`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.auth}`,
          'Content-Type': 'application/invocations+car',
        },
        body: car,
      })

      if (!res.ok) {
        const reason = await res.text().catch(() => '')
        throw new Error(`HTTP post failed: ${res.status} - ${reason}`)
      }
    } catch (error) {
      throw new Error(`Failed to log invocations: ${error}`, { cause: error })
    }
  }

  /**
   * @param {API.ReceiptBlock} receipt
   */
  async logReceipt(receipt) {
    try {
      await pRetry(
        async () => {
          const res = await fetch(`${this.url}/ucan`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${this.auth}`,
              'Content-Type': 'application/receipt+dag-cbor',
            },
            body: receipt.bytes,
          })
          if (!res.ok) {
            throw new Error(`HTTP request status not ok: ${res.status}`)
          }
          return res
        },
        {
          retries: 3,
        }
      )
    } catch (error) {
      throw new Error(
        `Failed to log receipt for invocation ${receipt.data.ran}: ${error}`,
        {
          cause: error,
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
    const { ucanlog } =
      /** @type {{ucanlog?: { invocations?: Array<Uint8Array> }}} */ (
        globalThis
      )
    if (typeof ucanlog?.invocations?.push === 'function') {
      ucanlog.invocations.push(car)
    }
  }

  /**
   * @param {API.ReceiptBlock} receipt
   */
  async logReceipt(receipt) {
    const { ucanlog } =
      /** @type {{ucanlog?: { receipts?: Array<API.ReceiptBlock> }}} */ (
        globalThis
      )
    if (typeof ucanlog?.receipts?.push === 'function') {
      try {
        ucanlog.receipts.push(receipt)
      } catch (error) {
        throw new Error(
          `Failed to log receipt for invocation ${receipt.data.ran}: ${error}`
        )
      }
    }
  }
}
