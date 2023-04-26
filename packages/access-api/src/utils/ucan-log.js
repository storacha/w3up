import * as CAR from '@ucanto/transport/car'
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
   * @param {import('@ucanto/server').HTTPRequest} request
   */
  async log(request) {
    try {
      await pRetry(
        async () => {
          const res = await fetch(`${this.url}/ucan`, {
            method: 'POST',
            headers: {
              ...request.headers,
              Authorization: `Basic ${this.auth}`,
            },
            body: request.body,
          })

          if (!res.ok) {
            const reason = await res.text().catch(() => '')
            throw new Error(`HTTP post failed: ${res.status} - ${reason}`)
          }
        },
        {
          retries: 3,
        }
      )
    } catch (error) {
      throw new Error(`Failed to log agent message: ${error}`, { cause: error })
    }
  }
}

/**
 * @implements {API.UCANLog}
 */
class UCANLogDebug {
  /**
   * @param {import('@ucanto/server').HTTPRequest} request
   */
  async log(request) {
    const { ucanlog } =
      /** @type {{ucanlog?: { invocations?: Array<API.Invocation>, receipts?: Array<API.Receipt> }}} */ (
        globalThis
      )
    // decode
    const selection = CAR.inbound.accept(request)
    if (selection.error) {
      console.error('unexpected UCAN encoding for UCAN log')
      return
    }
    const message = await selection.ok.decoder.decode(request)



    // Log invocations
    if (typeof ucanlog?.invocations?.push === 'function') {
      for (const invocation of message.invocations) {
        ucanlog.invocations.push(invocation)
      }
    }

    // Log receipts
    if (typeof ucanlog?.receipts?.push === 'function') {
      for (const receipt of message.receipts.values()) {
        // @ts-expect-error TODO
        ucanlog.receipts.push(receipt)
      }
    }
  }
}
