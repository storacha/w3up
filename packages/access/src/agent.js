// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'
import { Peer } from './awake/peer.js'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import { delegate } from '@ucanto/core'
import * as Voucher from './capabilities/voucher.js'
import * as Account from './capabilities/account.js'
import { Websocket } from './utils/ws.js'
import { stringToDelegation } from './encoding.js'
import { URI } from '@ucanto/validator'

/**
 * @template T
 * @typedef {{
 * store: import('./stores/types').Store<T>
 * connection: Ucanto.ConnectionView<import('./types').Service>,
 * url?: URL,
 * fetch?: typeof fetch
 * service: Ucanto.Principal
 * data: import('./stores/types').StoreData<T>
 * }} AgentOptions
 */

/**
 * @template T
 * @typedef {{
 * store: import('./stores/types').Store<T>
 * url?: URL,
 * fetch?: typeof fetch
 * }} AgentCreateOptions
 */

const HOST = 'https://access.web3.storage'

/**
 * @template {string} T
 * @param {Ucanto.Principal<T>} principal
 * @param {typeof fetch} _fetch
 * @param {URL} url
 * @returns { Promise<{service: Ucanto.UCAN.PrincipalView, connection: import('@ucanto/interface').ConnectionView<import('./types').Service>}>}
 */
export async function buildConnection(principal, _fetch, url) {
  const rsp = await _fetch(url + 'version')
  const { did } = await rsp.json()
  const service = DID.parse(did)

  const connection = Client.connect({
    id: principal,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url,
      method: 'POST',
      fetch: _fetch,
    }),
  })

  return { service, connection }
}

/**
 * @template {Ucanto.Signer} T
 * Agent
 */
export class Agent {
  /**
   * @param {AgentOptions<T>} opts
   */
  constructor(opts) {
    this.store = opts.store
    this.service = opts.service
    this.url = opts.url || new URL(HOST)
    this.fetch = opts.fetch
    this.connection = opts.connection
    this.data = opts.data
    this.issuer = opts.data.principal

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
   * @template {Ucanto.Signer} T
   * @param {AgentCreateOptions<T>} opts
   */
  static async create(opts) {
    let _fetch = opts.fetch
    const url = opts.url || new URL(HOST)

    // validate fetch implementation
    if (!_fetch) {
      if (typeof globalThis.fetch !== 'undefined') {
        _fetch = globalThis.fetch.bind(globalThis)
      } else {
        throw new TypeError(
          `Agent got undefined \`fetch\`. Try passing in a \`fetch\` implementation explicitly.`
        )
      }
    }

    const data = await opts.store.load()
    const { connection, service } = await buildConnection(
      data.principal,
      _fetch,
      url
    )
    return new Agent({
      connection,
      service,
      fetch: _fetch,
      url,
      store: opts.store,
      data,
    })
  }

  did() {
    return this.data.principal.did()
  }

  /**
   * @param {string} email
   */
  async createAccount(email) {
    const account = await this.store.createAccount()
    const accDelegation = await delegate({
      // @ts-ignore
      issuer: account,
      audience: this.data.principal,
      capabilities: [
        {
          can: 'voucher/*',
          with: account.did(),
        },
        {
          can: 'account/*',
          with: account.did(),
        },
      ],
      lifetimeInSeconds: 8_600_000,
    })

    const inv = await Voucher.claim
      .invoke({
        issuer: this.data.principal,
        audience: this.service,
        with: account.did(),
        nb: {
          identity: URI.from(`mailto:${email}`),
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

    const accInv = await Voucher.redeem
      .invoke({
        issuer: this.data.principal,
        audience: this.service,
        with: this.service.did(),
        nb: {
          account: account.did(),
          identity: voucherRedeem.capabilities[0].nb.identity,
          product: voucherRedeem.capabilities[0].nb.product,
        },
        proofs: [voucherRedeem],
      })

      .execute(this.connection)

    if (accInv && accInv.error) {
      throw new Error('Account registration failed', { cause: accInv })
    }
    this.data.delegations.addMany([voucherRedeem, accDelegation])
    this.data.accounts.push(account)
    this.store.save(this.data)
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
   * @param {Ucanto.Principal} audience
   * @param {import('@ipld/dag-ucan').Capabilities} capabilities
   * @param {number} [lifetimeInSeconds]
   */
  async delegate(audience, capabilities, lifetimeInSeconds) {
    const delegation = await this.data.delegations.delegate(
      audience,
      capabilities,
      lifetimeInSeconds
    )

    await this.store.save(this.data)
    return delegation
  }

  /**
   *
   * @param {import('@ucanto/interface').Delegation} delegation
   */
  async addDelegation(delegation) {
    await this.data.delegations.add(delegation)
    await this.store.save(this.data)
  }

  /**
   *
   * @param {import('../src/awake/types').Channel} channel
   */
  peer(channel) {
    return new Peer({ agent: this, channel })
  }

  /**
   * @param {Ucanto.URI<"did:">} account
   */
  async getAccountInfo(account) {
    const proofs = isEmpty(this.data.delegations.getByResource(account))
    if (!proofs) {
      throw new TypeError('No proofs for "account/info".')
    }

    const inv = await Account.info
      .invoke({
        issuer: this.issuer,
        audience: this.service,
        with: account,
        proofs,
      })
      .execute(this.connection)

    return inv
  }
}

/**
 * @template T
 * @param { Array<T | undefined> | undefined} arr
 */
function isEmpty(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return
  }

  return /** @type {T[]} */ (arr)
}
