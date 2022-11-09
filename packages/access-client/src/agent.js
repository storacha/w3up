import * as DID from '@ipld/dag-ucan/did'
import * as Client from '@ucanto/client'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import { URI } from '@ucanto/validator'
import { Peer } from './awake/peer.js'
import * as Account from './capabilities/account.js'
import * as Voucher from './capabilities/voucher.js'
import { any as Any } from './capabilities/any.js'
import { stringToDelegation } from './encoding.js'
import { Websocket, AbortError } from './utils/ws.js'

/**
 * @template T
 * @typedef {{
 * store: import('./stores/types').Store<T>
 * connection: Ucanto.ConnectionView<import('./types').Service>,
 * url?: URL,
 * fetch: typeof fetch
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
 * @returns { Promise<import('@ucanto/interface').ConnectionView<import('./types').Service>>}
 */
export async function connection(principal, _fetch, url) {
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

  return connection
}

/**
 * @template {Ucanto.Signer} T
 * Agent
 */
export class Agent {
  /** @type {Ucanto.Principal|undefined} */
  #service

  /** @type {typeof fetch} */
  #fetch

  /**
   * @param {AgentOptions<T>} opts
   */
  constructor(opts) {
    this.url = opts.url || new URL(HOST)
    this.connection = opts.connection
    this.issuer = opts.data.principal
    this.store = opts.store
    this.data = opts.data

    // private
    this.#fetch = opts.fetch
    this.#service = undefined
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
    return new Agent({
      connection: await connection(data.principal, _fetch, url),
      fetch: _fetch,
      url,
      store: opts.store,
      data,
    })
  }

  async service() {
    if (this.#service) {
      return this.#service
    }
    const rsp = await this.#fetch(this.url + 'version')
    const { did } = await rsp.json()
    this.#service = DID.parse(did)
    return this.#service
  }

  did() {
    return this.data.principal.did()
  }

  /**
   * @param {string} email
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async createAccount(email, opts) {
    const account = await this.store.createAccount()
    const service = await this.service()
    const delegationToAgent = await Any.delegate({
      issuer: account,
      audience: this.issuer,
      with: account.did(),
      expiration: Infinity,
    })

    const inv = await Voucher.claim
      .invoke({
        issuer: this.issuer,
        audience: service,
        with: account.did(),
        nb: {
          identity: URI.from(`mailto:${email}`),
          product: 'product:free',
          service: service.did(),
        },
        proofs: [delegationToAgent],
      })
      .execute(this.connection)

    if (inv && inv.error) {
      throw new Error('Account creation failed', { cause: inv.error })
    }

    const voucherRedeem = await this.#waitForVoucherRedeem(opts)
    // TODO save this delegation so we can revoke later
    const delegationToService = await Any.delegate({
      issuer: account,
      audience: service,
      with: account.did(),
      expiration: Infinity,
    })
    const accInv = await Voucher.redeem
      .invoke({
        issuer: this.data.principal,
        audience: service,
        with: service.did(),
        nb: {
          account: account.did(),
          identity: voucherRedeem.capabilities[0].nb.identity,
          product: voucherRedeem.capabilities[0].nb.product,
        },
        proofs: [voucherRedeem, delegationToService],
      })

      .execute(this.connection)

    if (accInv && accInv.error) {
      throw new Error('Account registration failed', { cause: accInv })
    }
    this.data.delegations.addMany([voucherRedeem, delegationToAgent])
    this.data.accounts.push(account)
    this.store.save(this.data)
  }

  /**
   *
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async #waitForVoucherRedeem(opts) {
    const ws = new Websocket(this.url, 'validate-ws')
    await ws.open()

    ws.send({
      did: this.did(),
    })

    try {
      const msg = await ws.awaitMsg(opts)

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
    } catch (error) {
      if (error instanceof AbortError) {
        await ws.close()
        throw new TypeError('Failed to get voucher/redeem', { cause: error })
      }
    }
    throw new TypeError('Failed to get voucher/redeem')
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
        audience: await this.service(),
        with: account,
        proofs,
      })
      .execute(this.connection)

    if (inv.error) {
      throw inv
    }

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
