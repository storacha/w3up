/* eslint-disable unicorn/prefer-spread */
import * as DID from '@ipld/dag-ucan/did'
import { sha256 } from 'multiformats/hashes/sha2'
import * as u8 from 'uint8arrays'
import { AckMessage } from './messages.js'

export class Requestor {
  /**
   * @param {{
   * channel: import('./types').Channel;
   * agent: import('@ucanto/interface').SigningAuthority;
   * }} opts
   */
  constructor(opts) {
    this.channel = opts.channel
    this.agent = opts.agent
    this.did = opts.agent.did()
    this.pin = Math.floor(Math.random() * 1_000_000)
    this.nextdid = undefined
    this.audience = undefined

    /**
     * @type {UCAN.DIDView | undefined} - Actual Responder DID
     */
    this.responderDid = undefined
  }

  /**
   * @param {import('@ucanto/interface').SigningAuthority} agent
   * @param {import('./types').Channel} channel
   */
  static async create(agent, channel) {
    return new Requestor({
      channel,
      agent,
    })
  }

  /**
   * Bootstrap `awake/init`, receive `awake/res` and send challenge to Responder
   *
   * @param {import('@ipld/dag-ucan').Capabilities} caps
   */
  async bootstrap(caps) {
    // step 2 - awake/init send
    this.channel.sendInit(caps)

    // step 3 - awake/res receive
    const { ucan } = await this.channel.awaitRes()

    // step 4 - awake/msg send
    // TODO: verify ucan, and check if proof includes caps sent previously

    const challenge = findKey(ucan.facts, 'awake/challenge')
    this.nextdid = DID.parse(findKey(ucan.facts, 'awake/nextdid'))

    if (challenge === 'oob-pin') {
      await this.sendPinSignature()
      return this.pin.toString()
    }

    // TODO: fail on unknown challenge with unknown-challenge message https://github.com/ucan-wg/awake#62-unknown-challenge-error
  }

  async awaitAck() {
    if (!this.nextdid) {
      throw new Error('No session is active. await ack')
    }

    const awakeMsgAck = await this.channel.awaitMsg(this.nextdid)

    const ack = AckMessage.parse(awakeMsgAck.msg)

    this.audience = DID.parse(ack['awake/ack'])
  }

  async link() {
    if (!this.nextdid || !this.audience) {
      throw new Error('No session is active. request link')
    }
    this.channel.sendMsg(this.nextdid, {
      cap: 'identity/identify',
    })

    const capsRsp = await this.channel.awaitMsg(this.nextdid)

    // @ts-ignore
    return capsRsp.msg.delegation
  }

  async sendPinSignature() {
    if (!this.nextdid) {
      throw new Error('No session is active.')
    }

    // Pin signature
    const bytes = u8.fromString(this.nextdid.did() + this.pin.toString())
    const signed = await this.agent.sign(await sha256.encode(bytes))
    this.channel.sendMsg(this.nextdid, {
      did: this.did,
      sig: u8.toString(signed, 'base64'),
    })
  }
}

/**
 * @param {any} arr
 * @param {string} key
 */
function findKey(arr, key) {
  for (const i of arr) {
    if (i[key]) {
      return i[key]
    }
  }
}
