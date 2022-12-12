import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import * as Signature from '@ipld/dag-ucan/signature'
import { Verifier } from '@ucanto/principal/ed25519'
import { sha256 } from 'multiformats/hashes/sha2'
import * as u8 from 'uint8arrays'
import { stringToDelegations, delegationsToString } from '../encoding.js'
import * as Messages from './messages.js'

export class Peer {
  /**
   * @param {{
   * channel: import('./types').Channel
   * agent: import('../agent').Agent
   * }} opts
   */
  constructor(opts) {
    this.channel = opts.channel
    this.agent = opts.agent
    this.did = opts.agent.did()
    this.challenge = undefined
    this.nextdid = undefined
    this.audience = undefined
    this.pin = Math.floor(Math.random() * 1_000_000)
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

  async awaitBootstrap() {
    // step 2 - awake/init receive
    const msg = await this.channel.awaitInit()
    this.nextdid = msg.did

    // step3 - awake/res send
    const ucan = await UCAN.issue({
      issuer: this.agent.issuer,
      audience: this.nextdid,
      capabilities: [{ with: 'awake:', can: '*' }],
      facts: [
        { 'awake/challenge': 'oob-pin' },
        // TODO: this should be rotated for the next step
        { 'awake/nextdid': this.channel.keypair.did },
      ],
      // TODO: proof for caps requested
    })

    await this.channel.sendRes(this.nextdid, ucan)

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
    const verifier = Verifier.parse(this.audience.did())
    const payload = u8.fromString(this.channel.keypair.did + pin)
    const payloadHash = await sha256.encode(payload)

    // @ts-ignore
    if (!(await verifier.verify(payloadHash, Signature.decode(sig)))) {
      throw new Error(
        `Challenge failed: ${pin} is not valid for the current challenge.`
      )
    }

    // challenge response
    await this.channel.sendMsg(this.nextdid, {
      'awake/ack': this.did,
    })
  }

  async awaitAck() {
    if (!this.nextdid) {
      throw new Error('No session is active. await ack')
    }

    const awakeMsgAck = await this.channel.awaitMsg(this.nextdid)

    const ack = Messages.AckMessage.parse(awakeMsgAck.msg)

    this.audience = DID.parse(ack['awake/ack'])
  }

  /**
   *
   * @param {{
   * caps: import('./types').LinkRequest['msg']['caps']
   * meta: import('./types').PeerMeta
   * }} opts
   */
  async link(opts) {
    if (!this.nextdid || !this.audience) {
      throw new Error('No session is active. request link')
    }

    const msg = {
      type: 'link',
      meta: opts.meta,
      caps: opts.caps,
    }
    this.channel.sendMsg(this.nextdid, msg)

    /** @type {import('./types').LinkResponse} */
    const capsRsp = await this.channel.awaitMsg(this.nextdid)
    const delegations = stringToDelegations(capsRsp.msg.delegation)

    await this.channel.sendFin(this.nextdid)

    await this.agent.addProof(delegations[0])

    return { delegation: delegations[0], meta: capsRsp.msg.meta }
  }

  async awaitLink() {
    if (!this.nextdid || !this.audience) {
      throw new Error('No challenge active.')
    }
    // request caps
    /** @type {import('./types').LinkRequest} */
    const reqCap = await this.channel.awaitMsg(this.nextdid)
    const d = await this.agent.delegate({
      abilities: ['*'], // TODO should be derived from reqCap
      audience: this.audience,
      expiration: Infinity,
      audienceMeta: reqCap.msg.meta,
    })
    this.channel.subscribe('awake/msg', (msg) => {
      this.channel.close()
    })
    this.channel.sendMsg(this.nextdid, {
      meta: {
        name: this.agent.did(),
        type: 'device',
      },
      delegation: delegationsToString([d]),
    })
  }

  /**
   * Build pin signature and send it
   *
   * @private
   */
  async sendPinSignature() {
    if (!this.nextdid) {
      throw new Error('No session is active.')
    }

    // Pin signature
    const bytes = u8.fromString(this.nextdid.did() + this.pin.toString())
    const signed = await this.agent.issuer.sign(await sha256.encode(bytes))
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
