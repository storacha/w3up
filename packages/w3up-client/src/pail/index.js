import { connect, ok, error } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as Pail from '@web3-storage/pail/crdt'
import * as Clock from '@web3-storage/pail/clock'
import * as ClockClient from '@web3-storage/clock/client'
import { clockServicePrincipal, clockServiceURL } from '../service.js'
import * as API from './api.js'
import { MemoryBlockstore } from '@web3-storage/pail/block'

export const create = ({}) => {
  const clock = new NetworkClock({})
  clock.addRemote(clockServicePrincipal, clockServiceURL)
  return new NetworkPail({ clock })
}

/** @implements {API.NetworkPail} */
class NetworkPail {
  #model
  #cache

  /**
   * @param {object} model
   * @param {API.Signer} model.signer
   * @param {API.Principal} model.resource
   * @param {API.Agent} model.agent
   * @param {API.NetworkClock<API.Operation>} model.clock
   * @param {API.BlockFetcher} model.blocks
   */
  constructor (model) {
    this.#model = model
    this.#cache = new MemoryBlockstore()
  }

  did() {
    return this.#model.resource.did()
  }

  async put (key, value) {

  }

  async get (key) {

  }

  /** @param {string} key */
  async del (key) {
    const result = await this.clock.head()
    const head = result.ok
    if (!head) return result
    const { event, additions } = await Pail.del(this.#model.blocks, head, key)
    // TODO: Store event & additions
    if (event) {
      await this.#model.store
      await this.clock.advance(event.cid, { blocks: [event] })
      this.#cache.putSync(event.cid, event.bytes)
      for (const b of additions) this.#cache.putSync(b.cid, b.bytes)
    }
    return { ok: {} }
  }

  /** @param {API.EntriesOptions} [options] */
  async * entries (options) {
    const result = await this.clock.head()
    const head = result.ok
    if (!head) {
      yield result
      return
    }
    for await (const entry of Pail.entries(this.#model.blocks, head, options)) {
      yield { ok: entry }
    }
  }

  /** @returns {API.NetworkClock<API.Operation>} */
  get clock () {
    return this.#model.clock
  }
}

/**
 * @template T
 * @implements {API.NetworkClock<T>}
 */
class NetworkClock {
  #model
  /** @type {Map<API.DID, API.RemoteClock<T>>} */
  #remotes = new Map()
  #head

  /**
   * @param {object} model
   * @param {API.Signer} model.signer
   * @param {API.Principal} model.resource
   * @param {API.Agent} model.agent
   * @param {API.EventLink<T>[]} model.head
   * @param {API.BlockFetcher} model.blocks
   */
  constructor (model) {
    this.#model = model
    this.#head = model.head
  }

  did () {
    return this.#model.resource.did()
  }


  async head () {
    return ok(this.#head)
  }
  
  /**
   * @param {API.EventLink<T>} event
   * @param {API.AdvanceOptions<T>} [options]
   */
  async advance (event, options) {
    try {
      this.#head = await Clock.advance(this.#model.blocks, this.#head, event)
      for (const remote of this.#remotes.values()) {
        const result = await remote.advance(event, options)
        const head = result.ok
        if (!head) return result
        for (const e of head) {
          this.#head = await Clock.advance(this.#model.blocks, this.#head, e)
        }
      }
      return ok(this.#head)
    } catch (/** @type {any} */ err) {
      return error(err)
    }
  }

  /** @returns {Record<API.DID, API.RemoteClock<T>>} */
  get remotes () {
    return Object.fromEntries(this.#remotes.entries())
  }

  /**
   * @param {API.Principal} id
   * @param {URL} url
   */
  addRemote (id, url) {
    this.#remotes.set(id.did(), new RemoteClock({ id, url, ...this.#model }))
  }

  /** @param {API.Principal} id */
  removeRemote (id) {
    this.#remotes.delete(id.did())
  }
}

/**
 * @template T
 * @implements {API.RemoteClock<T>}
 */
class RemoteClock {
  #model
  /** @type {API.ConnectionView<API.ClockService<T>>} */
  #connection

  /**
   * @param {object} model
   * @param {API.Principal} model.id
   * @param {URL} model.url
   * @param {API.Signer} model.signer
   * @param {API.Principal} model.resource
   * @param {API.Agent} model.agent
   */
  constructor (model) {
    this.#model = model
    this.#connection = connect({
      id: model.id,
      codec: CAR.outbound,
      channel: HTTP.open({
        url: model.url,
        method: 'POST',
      }),
    })
  }

  did () {
    return this.#model.id.did()
  }

  get url () {
    return this.#model.url
  }

  async head () {
    const { agent, resource, signer: issuer } = this.#model
    const proofs = agent.proofs([{ with: resource.did(), can: 'clock/head' }])
    const result = await ClockClient.head({ issuer, with: resource.did(), proofs }, { connection: this.#connection })
    return result.out.error ? result.out : ok(result.out.ok.head)
  }
  
  /**
   * @param {API.EventLink<T>} event
   * @param {API.AdvanceOptions<T>} [options]
   */
  async advance (event, options) {
    const { agent, resource, signer: issuer } = this.#model
    const proofs = agent.proofs([{ with: resource.did(), can: 'clock/advance' }])
    const result = await ClockClient.advance(
      { issuer, with: resource.did(), proofs },
      event,
      { connection: this.#connection, ...options }
    )
    // TODO: verify cause invocation for each head
    return result.out.error ? result.out : ok(result.out.ok.head)
  }
}