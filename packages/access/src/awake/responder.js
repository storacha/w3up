import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import * as u8 from 'uint8arrays'
import * as Keypair from '@ucanto/authority'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Messages from './messages.js'

export class Responder {
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
    this.challenge = undefined
    this.nextdid = undefined
    this.audience = undefined
  }

  async bootstrap() {
    // step 2 - awake/init receive
    const msg = await this.channel.awaitInit()
    this.nextdid = msg.did

    // step3 - awake/res send
    const ucan = await UCAN.issue({
      issuer: this.agent,
      audience: this.nextdid,
      // @ts-ignore
      capabilities: [],
      facts: [
        { 'awake/challenge': 'oob-pin' },
        // TODO: this should be rotated for the next step
        { 'awake/nextdid': this.channel.keypair.did },
      ],
      // TODO: proof for caps requested
    })

    this.channel.sendRes(this.nextdid, ucan)

    // step 4 - awake/msg receive
    const challengeMsg = await this.channel.awaitMsg(this.nextdid)
    const { did, sig } = Messages.PinChallengeMessage.parse(challengeMsg.msg)
    this.audience = DID.parse(did)
    this.challenge = sig
  }

  /**
   * Acknowledgment for the PIN challenge
   *
   * @param {string} pin
   */
  async ack(pin) {
    if (!this.challenge || !this.nextdid || !this.audience) {
      throw new Error('No challenge active.')
    }

    // step 5 - awake/ack challenge confirmation and send
    const sig = u8.fromString(this.challenge, 'base64')
    // @ts-ignore
    const verifier = Keypair.Authority.parse(this.audience.did())
    const payload = u8.fromString(this.channel.keypair.did + pin)
    const payloadHash = await sha256.encode(payload)

    // @ts-ignore
    if (!(await verifier.verify(payloadHash, sig))) {
      throw new Error(
        `Challenge failed: ${pin} is not valid for the current challenge.`
      )
    }

    // challenge response
    this.channel.sendMsg(this.nextdid, {
      'awake/ack': this.did,
    })
  }

  async awaitLink() {
    if (!this.nextdid || !this.audience) {
      throw new Error('No challenge active.')
    }
    // request caps
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    const reqCap = await this.channel.awaitMsg(this.nextdid)
    const delegation = await UCAN.issue({
      audience: this.audience,
      issuer: this.agent,
      capabilities: [{ with: this.agent.did(), can: 'identity/identify' }],
      lifetimeInSeconds: 8_600_000,
    })

    this.channel.sendMsg(this.nextdid, {
      delegation: UCAN.format(delegation),
    })
  }
}
