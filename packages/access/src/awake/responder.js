import { EcdhKeypair } from '../crypto/p256-ecdh.js'
import { Channel } from './channel.js'
import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import * as u8 from 'uint8arrays'
import * as Keypair from '@ucanto/authority'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Messages from './messages.js'

export class Responder {
  /**
   * @param {{
   * channel: Channel;
   * agent: import('@ucanto/interface').SigningAuthority;
   * }} opts
   */
  constructor(opts) {
    this.channel = opts.channel
    this.agent = opts.agent
    this.did = opts.agent.did()
    this.challengeMsg = undefined
    // this.channel.subscribe(
    //   'awake/init',
    //   (data) => {
    //     console.log('yoo', data)
    //   },
    //   true
    // )
  }

  /**
   * @param {URL} host
   * @param {import('@ucanto/interface').SigningAuthority} agent
   */
  static async create(host, agent) {
    const channel = new Channel(host, agent.did(), await EcdhKeypair.create())

    return new Responder({
      channel,
      agent,
    })
  }

  async bootstrap() {
    // step 2 - awake/init receive
    const msg = await this.channel.awaitMessage('awake/init')
    const requesterDID = msg.did

    // step3 - awake/res send
    const ucan = await UCAN.issue({
      issuer: this.agent,
      audience: DID.parse(requesterDID),
      capabilities: [],
      facts: [
        { 'awake/challenge': 'oob-pin' },
        { 'awake/nextdid': await this.channel.did() },
      ],
    })

    const encrypted = await this.channel.keypair.encryptForDid(
      UCAN.format(ucan),
      requesterDID
    )

    this.channel.awakeRes(await this.channel.did(), requesterDID, encrypted)

    // step 4 - awake/msg receive
    const pinMsg = await this.channel.awaitMessage('awake/msg')
    const decryptedMsg = await this.channel.keypair.decryptFromDid(
      pinMsg.msg,
      requesterDID
    )

    this.challengeMsg = Messages.PinChallengeMessage.parse(
      JSON.parse(decryptedMsg)
    )
  }

  /**
   * @param {string} pin
   */
  async challenge(pin) {
    if (!this.challengeMsg) {
      throw new Error('No challenge active.')
    }

    // step 5 - awake/ack challenge confirmation and send
    const sig = u8.fromString(this.challengeMsg.sig, 'base64')
    const verifier = Keypair.Authority.parse(this.challengeMsg.did)
    const payload = u8.fromString((await this.channel.did()) + pin)
    const payloadHash = await sha256.encode(payload)

    // @ts-ignore
    const result = await verifier.verify(payloadHash, sig)
    // eslint-disable-next-line no-console
    console.log(result)
  }
}
