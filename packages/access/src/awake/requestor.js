import { EcdhKeypair } from '../crypto/p256-ecdh.js'
import { Channel } from './channel.js'
import * as UCAN from '@ipld/dag-ucan'
import { sha256 } from 'multiformats/hashes/sha2'
import * as u8 from 'uint8arrays'

export class Requestor {
  /**
   * @param {{
   * channel: Channel;
   * agent: import('@ucanto/interface').SigningAuthority;
   * responderDID?: string;
   * }} opts
   */
  constructor(opts) {
    this.channel = opts.channel
    this.agent = opts.agent
    this.did = opts.agent.did()
    this.responderDid = opts.responderDID
    this.pin = Math.floor(Math.random() * 1_000_000)
  }

  /**
   * @param {URL} host
   * @param {import('@ucanto/interface').SigningAuthority} agent
   * @param {string} responderDID
   */
  static async create(host, agent, responderDID) {
    const channel = new Channel(host, responderDID, await EcdhKeypair.create())

    return new Requestor({
      channel,
      agent,
      responderDID,
    })
  }

  /**
   * @param {import('@ipld/dag-ucan').Capability[]} caps
   */
  async broadcastIntent(caps) {
    // step 2 - awake/init send
    this.channel.awakeInit(await this.channel.did(), caps)

    // step 3 - awake/res receive
    const msg = await this.channel.awaitMessage('awake/res')
    const decrypted = await this.channel.keypair.decryptFromDid(
      msg.msg,
      msg.iss
    )

    // step 4 - awake/msg send
    const ucan = UCAN.parse(decrypted)
    // TODO: verify ucan, and check if proof includes caps sent previously

    // const challenge = findKey(ucan.facts, 'awake/challenge')
    const nextdid = findKey(ucan.facts, 'awake/nextdid')

    // TODO: fail on unknown challenge with unknown-challenge message https://github.com/ucan-wg/awake#62-unknown-challenge-error

    const bytes = u8.fromString(nextdid + this.pin.toString(), 'utf8')
    const signed = await this.agent.sign(await sha256.encode(bytes))
    const challengeRsp = {
      did: this.did,
      sig: u8.toString(signed, 'base64'),
    }

    const id = await sha256.encode(this.channel.did() + msg.iss)
    this.channel.awakeMsg(
      u8.toString(id, 'base64'),
      await this.channel.keypair.encryptForDid(
        JSON.stringify(challengeRsp),
        nextdid
      )
    )
    // console.log('PIN', this.pin.toString())
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
