import { Delegations } from './delegations.js'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import { Peer } from './awake/peer.js'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import { delegate } from '@ucanto/core'
import * as Voucher from './capabilities/voucher.js'
import { Websocket } from './utils/ws.js'
import { stringToDelegation } from './encoding.js'

/**
 * @typedef {{
 * store: import('./stores/store-conf').StoreConf
 * url?: URL,
 * fetch?: typeof fetch
 * }} AgentOptions
 */

const HOST = 'https://access-api.web3.storage'

/**
 * Agent
 */
export class Agent {
  /**
   * @param {AgentOptions} opts
   */
  constructor(opts) {
    this.store = opts.store
    this.meta = undefined
    this.delegations = undefined
    this.principal = undefined
    this.service = undefined
    this.url = opts.url || new URL(HOST)
    this.fetch = opts.fetch

    /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service> | undefined} */
    this.connection = undefined

    /** @type {Types.SigningPrincipal[]} */
    this.accounts = []

    // validate fetch implementation
    if (!this.fetch) {
      if (typeof globalThis.fetch !== 'undefined') {
        this.fetch = globalThis.fetch.bind(globalThis)
      } else {
        throw new TypeError(
          `Agent got undefined \`fetch\`. Try passing in a \`fetch\` implementation explicitly.`
        )
      }
    }
  }

  /**
   *
   * @param {AgentOptions} opts
   */
  static async create(opts) {
    return new Agent({
      ...opts,
      store: await opts.store.open(),
    })
  }

  isSetup() {
    return this.store.isSetup()
  }

  /**
   * @param {Types.Principal} principal
   */
  async _connection(principal) {
    const rsp = await this.fetch(this.url + 'version')
    // @ts-ignore
    const { did } = await rsp.json()
    // TODO how to parse any DID ????
    this.service = Principal.parse(did)

    this.connection = Client.connect({
      id: principal,
      encoder: CAR,
      decoder: CBOR,
      channel: HTTP.open({
        url: new URL(this.url),
        method: 'POST',
        // @ts-ignore
        fetch: this.fetch,
      }),
    })
  }

  /**
   *
   * @param {import('./awake/types').PeerMeta} meta
   */
  async setup(meta) {
    this.accounts = await this.store.setAccounts([])
    this.meta = await this.store.setMeta(meta)
    this.principal = await this.store.setPrincipal()
    this.delegations = await this.store.setDelegations(
      new Delegations({
        principal: this.principal,
      })
    )
    await this._connection(this.principal)

    return {
      ...meta,
      did: this.principal.did(),
    }
  }

  async import() {
    if (!this.isSetup()) {
      throw new Error('Agent store is not setup yet.')
    }

    this.accounts = await this.store.getAccounts()
    this.meta = await this.store.getMeta()
    this.principal = await this.store.getPrincipal()
    this.delegations = await this.store.getDelegations()
    await this._connection(this.principal)

    return {
      ...this.meta,
      did: this.principal.did(),
      delegations: this.delegations,
    }
  }

  did() {
    if (!this.principal) {
      throw new Error('Run setup or import first.')
    }
    return this.principal.did()
  }

  /**
   * @param {string} email
   */
  async createAccount(email) {
    if (!this.principal || !this.service || !this.connection) {
      throw new Error('Run setup or import first.')
    }
    const account = await this.store.newAccount()
    const accDelegation = await delegate({
      // @ts-ignore
      issuer: account,
      audience: this.principal,
      capabilities: [
        {
          can: 'voucher/*',
          with: account.did(),
        },
      ],
      lifetimeInSeconds: 8_600_000,
    })

    const inv = await Voucher.claim
      .invoke({
        issuer: this.principal,
        audience: this.service,
        with: account.did(),
        caveats: {
          identity: `mailto:${email}`,
          product: 'product:free',
          service: this.service.did(),
        },
        proofs: [accDelegation],
      })
      .execute(this.connection)

    if (inv && inv.error) {
      throw new Error('Account creation failed', { cause: inv.error })
    }

    const voucherRedeem = await this._waitForVoucherRedeem()

    this.delegations?.add(voucherRedeem)
    this.delegations?.add(accDelegation)
    this.accounts.push(account)
    this.store.save(this)

    const accInv = await Voucher.redeem
      .invoke({
        issuer: this.principal,
        audience: this.service,
        with: this.service.did(),
        caveats: {
          account: account.did(),
          identity: voucherRedeem.capabilities[0].identity,
          product: voucherRedeem.capabilities[0].product,
        },
        proofs: [voucherRedeem],
      })
      .execute(this.connection)

    if (accInv && accInv.error) {
      throw new Error('Account registration failed', { cause: accInv })
    }
  }

  async _waitForVoucherRedeem() {
    const ws = new Websocket(this.url, 'validate-ws')
    await ws.open()
    ws.send({
      did: this.did(),
    })
    const msg = await ws.awaitMsg()
    if (msg.type === 'timeout') {
      await ws.close()
      throw new Error('Email validation timed out.')
    }

    if (msg.type === 'delegation') {
      const delegation = await stringToDelegation(
        /** @type {import('./types').EncodedDelegation<[import('./types').VoucherRedeem]>} */ (
          msg.delegation
        )
      )
      ws.close()
      return delegation
    }

    throw new Error('Failed to get voucher/redeem')
  }

  /**
   *
   * @param {Types.UCAN.DIDView} audience
   * @param {import('@ipld/dag-ucan').Capabilities} capabilities
   * @param {number} [lifetimeInSeconds]
   */
  delegate(audience, capabilities, lifetimeInSeconds) {
    if (!this.delegations) {
      throw new Error('Run setup or import first.')
    }
    return this.delegations.delegate(audience, capabilities, lifetimeInSeconds)
  }

  /**
   *
   * @param {import('../src/awake/types').Channel} channel
   */
  peer(channel) {
    return new Peer({ agent: this, channel })
  }
}
