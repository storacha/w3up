/* eslint-disable no-console */
import WS from 'isomorphic-ws'
import pWaitFor from 'p-wait-for'
import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import { concatEncode } from './encoding.js'
import * as Messages from './messages.js'

const AWAKE_VERSION = '0.1.0'

/**
 * @typedef {import('./types').Channel} ChannelType
 * @implements {ChannelType}
 */
export class Channel {
  /**
   * @param {string | URL} host
   * @param {string} topic
   * @param {import('../crypto/types').KeyExchangeKeypair} keypair
   */
  constructor(host, topic, keypair) {
    this.url = new URL('connect/' + topic, host)
    this.ws = this.connect()
    this.attemps = 0
    /**
     * @type {string | number | NodeJS.Timeout | undefined}
     */
    this.timeout = undefined
    this.forceClose = false
    this.isOpen = false
    /** @type {Record<string, Record<string, ((data: unknown) => void) | undefined>> } */
    this.messageSubs = {}
    this.lastUid = 0
    this.onMessage = undefined
    this.keypair = keypair
  }

  connect() {
    if (this.attemps > 10) {
      return
    }

    const ws = new WS(this.url)

    ws.addEventListener('close', (event) => {
      this.isOpen = false
      if (!this.forceClose && !this.timeout) {
        this.timeout = setTimeout(() => {
          this.attemps++
          this.connect()
        }, 1000)
        console.log('WebSocket closed, reconnecting:', event.code, event.reason)
      } else {
        // console.log('WebSocket closed:', event.code, event.reason)
      }
    })
    ws.addEventListener('error', (event) => {
      console.log('WebSocket error', event)
    })
    ws.addEventListener('open', (event) => {
      // console.log('WebSocket open')
      clearTimeout(this.timeout)
      this.timeout = undefined
      this.isOpen = true
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
  close(code, reason) {
    if (!this.ws) {
      return console.log('ws closed')
    }
    this.isOpen = false
    this.forceClose = true
    this.ws.close(code, reason)
    this.ws = undefined
  }

  /**
   * @param {import('./types').MessageType} message
   * @param { (data: unknown) => void } fn
   * @param {any} once
   */
  subscribe(message, fn, once) {
    const token = 'uid_' + String(this.lastUid++)

    if (!this.messageSubs[message]) {
      this.messageSubs[message] = {}
    }

    if (once) {
      this.messageSubs[message][token] = (data) => {
        this.unsubscribe(token)
        Reflect.apply(fn, this, [data])
      }
    } else {
      this.messageSubs[message][token] = fn
    }
  }

  /**
   * @param {string} token
   */
  unsubscribe(token) {
    for (const [key] of Object.entries(this.messageSubs)) {
      if (this.messageSubs[key][token]) {
        this.messageSubs[key][token] = undefined
      }
    }
  }

  /**
   * @param {import('./types').AwakeMessage} data
   */
  publish(data) {
    const { type } = data

    const topic = this.messageSubs[type]
    if (!topic) {
      // console.log('no subs on topic', type)
      return
    }

    for (const [, value] of Object.entries(topic)) {
      if (value) {
        value(data)
      }
    }
  }

  /**
   * @type {ChannelType['awaitInit']}
   */
  async awaitInit() {
    return new Promise((resolve, reject) => {
      this.onMessage = (/** @type {import('./types').AwakeMessage} */ msg) => {
        if (msg.type === 'awake/init') {
          this.onMessage = undefined
          console.log('receive', msg.type)

          const result = Messages.InitResponse.safeParse(msg)
          if (result.success) {
            const { data } = result
            resolve({
              awv: data.awv,
              type: data.type,
              did: DID.parse(data.did),
              caps: /** @type {UCAN.Capabilities} */ (data.caps),
            })
          }
        }
      }
    })
  }

  /**
   * @type {ChannelType['awaitRes']}
   */
  async awaitRes() {
    return new Promise((resolve, reject) => {
      this.onMessage = async (
        /** @type {import('./types').AwakeMessage} */ msg
      ) => {
        if (msg.type === 'awake/res') {
          this.onMessage = undefined
          console.log('receive res', msg.type)

          const result = Messages.ResResponse.safeParse(msg)
          if (result.success) {
            const { data } = result
            const decryptedMsg = await this.keypair.decryptFromDid(
              data.msg,
              // @ts-ignore just a string...
              data.iss
            )
            resolve({
              awv: data.awv,
              type: data.type,
              iss: DID.parse(data.iss),
              aud: DID.parse(data.aud),
              ucan: UCAN.parse(decryptedMsg),
            })
          }
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
      }
    })
  }

  /**
   * @param {any} data
   */
  async send(data) {
    if (!this.ws) {
      throw new Error('Websocket is not active.')
    }

    await pWaitFor(() => this.isOpen)
    this.ws.send(JSON.stringify(data))
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
    const id = await concatEncode([await this.keypair.pubkey(), did])

    this.send({
      awv: AWAKE_VERSION,
      type: 'awake/msg',
      id,
      msg: await this.keypair.encryptForDid(JSON.stringify(msg), did.did()),
    })
  }
}
