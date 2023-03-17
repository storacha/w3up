/* eslint-disable no-console */
import WS from 'isomorphic-ws'
import pWaitFor from 'p-wait-for'

/**
 * @template [T=unknown]
 * @typedef {(event: T) => void} Handler
 */

/**
 * @template [T=unknown]
 * @typedef {Array<Handler<T>> } EventHandlerList
 */

/**
 * @template {Record<string, unknown>} [Events=Record<string, unknown>]
 * @typedef {Map<keyof Events, EventHandlerList<Events[keyof Events]>>} EventHandlerMap
 */

export class Websocket {
  /** @type {EventHandlerMap} */
  #subs

  /**
   * @param {URL} host
   * @param {string} topic
   */
  constructor(host, topic) {
    this.url = new URL(topic, host)
    if (host.protocol === 'http:') {
      this.url.protocol = 'ws:'
    }
    if (host.protocol === 'https:') {
      this.url.protocol = 'wss:'
    }
    this.ws = undefined
    this.#subs = new Map()
    this.attemps = 0
    this.onMessage = undefined
    /**
     * @type {string | number | NodeJS.Timeout | undefined}
     */
    this.timeout = undefined
    this.forceClose = false
  }

  /**
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async open(opts) {
    this.ws = this.connect()
    await pWaitFor(() => opts?.signal?.aborted || this.ws?.readyState === 1)
    return this
  }

  connect() {
    if (this.attemps > 10) {
      return
    }

    const ws = new WS(this.url)
    this.ws = ws

    ws.addEventListener('close', (event) => {
      if (!this.forceClose && !this.timeout) {
        this.timeout = setTimeout(() => {
          this.attemps++
          this.connect()
        }, 1000)
        console.log('WebSocket closed, reconnecting:', event.code, event.reason)
      } else {
        clearTimeout(this.timeout)
        this.timeout = undefined
        // console.log('WebSocket closed:', event.code, event.reason)
      }
    })
    ws.addEventListener('error', (event) => {
      // console.log('WebSocket error', event)
    })
    ws.addEventListener('open', (event) => {
      // console.log('WebSocket open')
      clearTimeout(this.timeout)
      this.timeout = undefined
    })
    ws.addEventListener('message', (event) => {
      // @ts-ignore
      const data = JSON.parse(event.data)
      if (data.error) {
        console.error(data.error)
      }

      if (data.type) {
        this.publish(data)
      }

      if (this.onMessage !== undefined && data.type) {
        this.onMessage(data)
      }
    })

    return ws
  }

  /**
   * @param {number} [code]
   * @param {string | Buffer } [reason]
   */
  async close(code, reason) {
    if (this.ws) {
      this.forceClose = true
      this.ws.close(code, reason)
      await pWaitFor(() => this.ws?.readyState === 3)
    }
    return this
  }

  /**
   * @param {any} data
   */
  send(data) {
    if (this.ws?.readyState !== 1) {
      throw new Error('Websocket is not active.')
    }

    this.ws.send(JSON.stringify(data))
  }

  /**
   * @param {string} type
   * @param { Handler } fn
   * @param {boolean} [once]
   */
  subscribe(type, fn, once) {
    let handlers = this.#subs.get(type)
    let handler = fn

    if (once) {
      handler = (data) => {
        handlers?.splice(handlers.indexOf(handler) >>> 0, 1)
        Reflect.apply(fn, this, [data])
      }
    }

    if (handlers) {
      handlers.push(handler)
    } else {
      handlers = [handler]
      this.#subs.set(type, handlers)
    }

    return () => {
      handlers?.splice(handlers.indexOf(handler) >>> 0, 1)
    }
  }

  /**
   * @param {string} type
   * @param { Handler } fn
   */
  unsubscribe(type, fn) {
    const handlers = this.#subs.get(type)
    if (handlers) {
      if (fn) {
        handlers.splice(handlers.indexOf(fn) >>> 0, 1)
      } else {
        this.#subs.set(type, [])
      }
    }
  }

  /**
   *
   * @param {unknown} data
   */
  publish(data) {
    // @ts-ignore
    const { type } = data

    const handlers = this.#subs.get(type)?.slice()
    if (handlers) {
      for (const h of handlers) {
        h(data)
      }
    }
  }

  /**
   *
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  awaitMsg(opts) {
    return new Promise((resolve, reject) => {
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          this.onMessage = undefined
          reject(
            new AbortError('Await message cancelled.', {
              cause: opts.signal?.reason,
            })
          )
        })
      }
      this.onMessage = (/** @type {{ type: string; }} */ msg) => {
        try {
          this.onMessage = undefined
          resolve(msg)
        } catch (error) {
          reject(error)
        }
      }
    })
  }
}

export class AbortError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [opts]
   */
  constructor(message, opts) {
    super(message, opts)
    this.name = 'AbortError'
    this.message = message
    this.code = AbortError.code
  }
}
AbortError.code = 'ERR_AWAIT_MSG_CANCEL'
