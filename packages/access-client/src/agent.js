/* eslint-disable max-depth */
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
import { any as Any } from './capabilities/wildcard.js'
import { stringToDelegation } from './encoding.js'
import { Websocket, AbortError } from './utils/ws.js'
import { Signer } from '@ucanto/principal/ed25519'
import { invoke, delegate } from '@ucanto/core'
import {
  isExpired,
  isTooEarly,
  validate,
  canDelegateCapability,
} from './delegations.js'

import { collect } from 'streaming-iterables'

const HOST = 'https://access.web3.storage'

/**
 * @template {string} T
 * @param {Ucanto.Principal<T>} principal
 * @param {typeof fetch} _fetch
 * @param {URL} url
 * @param {Ucanto.Transport.Channel<import('./types').Service>} [channel]
 * @returns {Promise<Ucanto.ConnectionView<import('./types').Service>>}
 */
export async function connection(principal, _fetch, url, channel) {
  const _channel =
    channel ||
    HTTP.open({
      url,
      method: 'POST',
      fetch: _fetch,
    })
  const connection = Client.connect({
    id: principal,
    encoder: CAR,
    decoder: CBOR,
    channel: _channel,
  })

  return connection
}

/**
 * @template {Ucanto.Signer} T
 * Agent
 */
export class Agent {
  /** @type {Ucanto.Principal<"key">|undefined} */
  #service

  /** @type {typeof fetch} */
  #fetch

  /**
   * @param {import('./types').AgentOptions<T>} opts
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
   * @param {import('./types').AgentCreateOptions<T>} opts
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

    if (!(await opts.store.exists())) {
      throw new Error('Store is not initialized, run "Store.init()" first.')
    }
    const data = await opts.store.load()
    return new Agent({
      connection: await connection(data.principal, _fetch, url, opts.channel),
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
   *
   * @param {Ucanto.Delegation} delegation
   */
  async addProof(delegation) {
    validate(delegation, {
      checkAudience: this.issuer,
      checkIsExpired: true,
    })

    this.data.dels.set(delegation.cid.toString(), {
      delegation,
    })

    await this.store.save(this.data)
  }

  /**
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  async *#delegations(caps) {
    const _caps = new Set(caps)
    for (const [key, value] of this.data.dels) {
      // check expiration
      if (!isExpired(value.delegation)) {
        // check if delegation can be used
        if (!isTooEarly(value.delegation)) {
          // check if we need to filter for caps
          if (caps) {
            for (const cap of _caps) {
              if (canDelegateCapability(value.delegation, cap)) {
                _caps.delete(cap)
                yield value
              }
            }
          } else {
            yield value
          }
        }
      } else {
        // delete any expired delegation
        this.data.dels.delete(key)
      }
    }

    await this.store.save(this.data)
  }

  /**
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  async *proofs(caps) {
    for await (const value of this.proofsWithMeta(caps)) {
      yield value.delegation
    }
  }

  /**
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  async *proofsWithMeta(caps) {
    for await (const value of this.#delegations(caps)) {
      if (value.delegation.audience.did() === this.issuer.did()) {
        yield value
      }
    }
  }

  /**
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  async *delegations(caps) {
    for await (const { delegation } of this.delegationsWithMeta(caps)) {
      yield delegation
    }
  }

  /**
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  async *delegationsWithMeta(caps) {
    for await (const value of this.#delegations(caps)) {
      if (value.delegation.audience.did() !== this.issuer.did()) {
        yield value
      }
    }
  }

  /**
   * @param {string} name
   */
  async createAccount(name) {
    const signer = await Signer.generate()
    const proof = await Any.delegate({
      issuer: signer,
      audience: this.issuer,
      with: signer.did(),
      expiration: Infinity,
    })

    this.data.accs.set(signer.did(), {
      name,
      registered: false,
    })

    await this.addProof(proof)

    return {
      did: signer.did(),
      proof,
    }
  }

  /**
   *
   * @param {Ucanto.DID} account
   */
  async setCurrentAccount(account) {
    const proofs = await collect(
      this.proofs([
        {
          can: 'account/info',
          with: account,
        },
      ])
    )

    if (proofs.length === 0) {
      throw new Error(`Agent has no proofs for ${account}.`)
    }

    this.data.currentAccount = account
    await this.store.save(this.data)

    return account
  }

  currentAccount() {
    return this.data.currentAccount
  }

  async currentAccountWithMeta() {
    if (!this.data.currentAccount) {
      return
    }

    // TODO cache these
    const proofs = await collect(
      this.proofs([
        {
          can: 'account/info',
          with: this.data.currentAccount,
        },
      ])
    )

    const caps = new Set()
    for (const p of proofs) {
      for (const cap of p.capabilities) {
        caps.add(cap.can)
      }
    }

    return {
      did: this.data.currentAccount,
      proofs,
      capabilities: [...caps],
    }
  }

  /**
   * @param {string} email
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async registerAccount(email, opts) {
    const account = this.currentAccount()
    const service = await this.service()

    if (!account) {
      throw new Error('No account selected')
    }

    const inv = await this.execute(Voucher.claim, {
      nb: {
        identity: URI.from(`mailto:${email}`),
        product: 'product:free',
        service: service.did(),
      },
    })

    if (inv && inv.error) {
      throw new Error('Account creation failed', { cause: inv.error })
    }

    const voucherRedeem = await this.#waitForVoucherRedeem(opts)
    const delegationToService = await this.delegate({
      abilities: ['*'],
      audience: service,
      audienceMeta: {
        name: 'w3access',
        type: 'service',
      },
    })

    const accInv = await this.execute(Voucher.redeem, {
      with: URI.from(service.did()),
      nb: {
        account,
        identity: voucherRedeem.capabilities[0].nb.identity,
        product: voucherRedeem.capabilities[0].nb.product,
      },
      proofs: [delegationToService],
    })

    if (accInv && accInv.error) {
      throw new Error('Account registration failed', { cause: accInv })
    }

    await this.addProof(voucherRedeem)
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
   * @param {import('./types').DelegationOptions} options
   */
  async delegate(options) {
    const account = await this.currentAccountWithMeta()
    if (!account) {
      throw new Error('there no account selected.')
    }

    const caps = /** @type {Ucanto.Capabilities} */ (
      options.abilities.map((a) => {
        return {
          with: account.did,
          can: a,
        }
      })
    )

    const delegation = await delegate({
      issuer: this.issuer,
      capabilities: caps,
      proofs: await collect(this.proofs(caps)),
      ...options,
    })

    this.data.dels.set(delegation.cid.toString(), {
      delegation,
      meta: {
        audience: options.audienceMeta,
      },
    })
    await this.store.save(this.data)
    return delegation
  }

  /**
   * @template {Ucanto.Ability} A
   * @template {Ucanto.URI} R
   * @template {Ucanto.TheCapabilityParser<Ucanto.CapabilityMatch<A, R, C>>} CAP
   * @template {Ucanto.Caveats} [C={}]
   * @param {CAP} cap
   * @param {import('./types').ExecuteOptions<A, R, CAP>} options
   */
  async execute(cap, options) {
    const _with = options.with || this.currentAccount()
    if (!_with) {
      throw new Error('there no account selected so you need pass a resource.')
    }

    const proofs = await collect(
      this.proofs([
        {
          with: _with,
          can: cap.can,
        },
      ])
    )

    if (proofs.length === 0) {
      throw new Error(
        `no proofs available for resource ${_with} and ability ${cap.can}`
      )
    }

    const extraProofs = options.proofs || []
    const inv = invoke({
      audience: options.audience || (await this.service()),
      // @ts-ignore
      capability: cap.create({
        with: _with,
        nb: options.nb,
      }),
      issuer: this.issuer,
      proofs: [...proofs, ...extraProofs],
    })

    // @ts-ignore
    const out = inv.execute(this.connection)

    return /** @type {Promise<Ucanto.InferServiceInvocationReturn<Ucanto.InferInvokedCapability<CAP>, import('./types').Service>>} */ (
      out
    )
  }

  /**
   *
   * @param {import('../src/awake/types').Channel} channel
   */
  peer(channel) {
    return new Peer({ agent: this, channel })
  }

  /**
   * @param {Ucanto.URI<"did:">} [account]
   */
  async getAccountInfo(account) {
    const inv = await this.execute(Account.info, {
      with: account,
    })

    if (inv.error) {
      throw inv
    }

    return inv
  }
}
