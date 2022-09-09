/* eslint-disable no-console */
import WS from 'isomorphic-ws'
import pWaitFor from 'p-wait-for'

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

  did() {
    return this.keypair.did()
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
        console.log('WebSocket closed:', event.code, event.reason)
      }
    })
    ws.addEventListener('error', (event) => {
      console.log('WebSocket error')
    })
    ws.addEventListener('open', (event) => {
      console.log('WebSocket open')
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
   * @param {any} data
   */
  async send(data) {
    if (!this.ws) {
      return console.log('ws closed')
    }

    await pWaitFor(() => this.isOpen)
    this.ws.send(JSON.stringify(data))
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
   *
   * @param {import('./types').MessageType} message
   */
  async awaitMessage(message) {
    return new Promise((resolve, reject) => {
      this.onMessage = (
        /** @type {{ type: import('./types').MessageType; }} */ msg
      ) => {
        if (msg.type === message) {
          this.onMessage = undefined
          console.log('receive', message)
          resolve(msg)
        }
      }
    })
  }

  /**
   * @param {string} iss
   * @param {string} aud
   * @param {string} msg
   */
  awakeRes(iss, aud, msg) {
    console.log('send awake/res')
    this.send({
      awv: '0.1.0',
      type: 'awake/res',
      iss,
      aud,
      msg,
    })
  }

  /**
   * @param {string} did
   * @param {import('@ipld/dag-ucan').Capability[]} caps
   */
  awakeInit(did, caps) {
    console.log('send awake/init')
    this.send({
      awv: '0.1.0',
      type: 'awake/init',
      did,
      caps,
    })
  }

  /**
   * @param {any} id
   * @param {any} msg
   */
  awakeMsg(id, msg) {
    console.log('send awake/msg')
    this.send({
      awv: '0.1.0',
      type: 'awake/msg',
      id,
      msg,
    })
  }
}
