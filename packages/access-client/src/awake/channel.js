/* eslint-disable no-console */
import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import WS from 'isomorphic-ws'
import pWaitFor from 'p-wait-for'
import { concatEncode } from './encoding.js'
import * as Messages from './messages.js'

const AWAKE_VERSION = '0.1.0'

/**
 * @template [T=unknown]
 * @typedef {(event: T) => void} Handler
 */

/**
 * @template [T=unknown]
 * @typedef {Array<Handler<T>> } EventHandlerList
 */

/**
 * @template {Record<import('./types').MessageType, unknown>} [Events=Record<import('./types').MessageType, unknown>]
 * @typedef {Map<keyof Events, EventHandlerList<Events[keyof Events]>>} EventHandlerMap
 */

/**
 * @typedef {import('./types').Channel} ChannelType
 * @implements {ChannelType}
 */
export class Channel {
  /** @type {EventHandlerMap} */
  #subs

  /**
   * @param {string | URL} host
   * @param {string} topic
   * @param {import('../crypto/types').KeyExchangeKeypair} keypair
   */
  constructor(host, topic, keypair) {
    this.url = new URL('connect/' + topic, host)
    this.ws = undefined
    this.keypair = keypair
    this.#subs = new Map()
    this.onMessage = undefined
    this.attemps = 0
    /**
     * @type {string | number | NodeJS.Timeout | undefined}
     */
    this.timeout = undefined
    this.forceClose = false
  }

  async open() {
    this.ws = this.connect()
    await pWaitFor(() => this.ws?.readyState === 1)
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
   * @param {import('./types').MessageType} type
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
   * @param {import('./types').MessageType} type
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
   * @private
   * @param {import('./types').AwakeMessage} data
   */
  publish(data) {
    const { type } = data

    const handlers = this.#subs.get(type)?.slice()
    if (handlers) {
      for (const h of handlers) {
        h(data)
      }
    }
  }

  /**
   * @type {ChannelType['awaitInit']}
   */
  awaitInit() {
    return new Promise((resolve, reject) => {
      this.onMessage = (/** @type {import('./types').AwakeMessage} */ msg) => {
        try {
          if (msg.type === 'awake/init') {
            this.onMessage = undefined
            console.log('receive', msg.type)

            const data = Messages.InitResponse.parse(msg)
            resolve({
              awv: data.awv,
              type: data.type,
              did: DID.parse(data.did),
              caps: /** @type {UCAN.Capabilities} */ (data.caps),
            })
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  /**
   * @type {ChannelType['awaitRes']}
   */
  awaitRes() {
    return new Promise((resolve, reject) => {
      this.onMessage = async (
        /** @type {import('./types').AwakeMessage} */ msg
      ) => {
        try {
          if (msg.type === 'awake/res') {
            this.onMessage = undefined
            console.log('receive', msg.type)

            const data = Messages.ResResponse.parse(msg)
            const iss = DID.parse(data.iss)
            const decryptedMsg = await this.keypair.decryptFromDid(
              data.msg,
              iss.did()
            )
            resolve({
              awv: data.awv,
              type: data.type,
              iss,
              aud: DID.parse(data.aud),
              ucan: UCAN.parse(decryptedMsg),
            })
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  /**
   *
   * @type {ChannelType['awaitMsg']}
   */
  awaitMsg(did) {
    return new Promise((resolve, reject) => {
      this.onMessage = async (
        /** @type {import('./types').AwakeMsg} */ msg
      ) => {
        try {
          if (
            msg.type === 'awake/msg' &&
            msg.msg &&
            typeof msg.msg === 'string'
          ) {
            this.onMessage = undefined

            msg.msg = JSON.parse(
              await this.keypair.decryptFromDid(msg.msg, did.did())
            )
            console.log('receive', msg.type)
            resolve(msg)
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  /**
   * @type {ChannelType['sendInit']}
   */
  async sendInit(caps) {
    console.log('send awake/init')
    this.send({
      awv: AWAKE_VERSION,
      type: 'awake/init',
      did: this.keypair.did,
      caps,
    })
  }

  /**
   * @type {ChannelType['sendRes']}
   */
  async sendRes(aud, ucan) {
    console.log('send awake/res')

    const msg = await this.keypair.encryptForDid(UCAN.format(ucan), aud.did())
    this.send({
      awv: AWAKE_VERSION,
      type: 'awake/res',
      iss: this.keypair.did,
      aud: aud.did(),
      msg,
    })
  }

  /**
   * @type {ChannelType['sendMsg']}
   */
  async sendMsg(did, msg) {
    console.log('send awake/msg')
    const id = await concatEncode([
      await this.keypair.pubkey(),
      DID.encode(did),
    ])

    this.send({
      awv: AWAKE_VERSION,
      type: 'awake/msg',
      id,
      msg: await this.keypair.encryptForDid(JSON.stringify(msg), did.did()),
    })
  }

  /**
   * @type {ChannelType['sendFin']}
   */
  async sendFin(did) {
    await this.sendMsg(did, {
      'awake/fin': 'disconnect',
    })

    await this.close()
  }
}
