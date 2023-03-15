/* eslint-disable max-depth */
import * as Client from '@ucanto/client'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import * as ucanto from '@ucanto/core'
import { URI } from '@ucanto/validator'
import { Peer } from './awake/peer.js'
import * as Space from '@web3-storage/capabilities/space'
import * as Access from '@web3-storage/capabilities/access'
import * as Provider from '@web3-storage/capabilities/provider'

import { stringToDelegation, bytesToDelegations } from './encoding.js'
import { Websocket, AbortError } from './utils/ws.js'
import { Signer } from '@ucanto/principal/ed25519'
import { Verifier } from '@ucanto/principal'
import { invoke, delegate, DID } from '@ucanto/core'
import {
  isExpired,
  isTooEarly,
  validate,
  canDelegateCapability,
} from './delegations.js'
import { AgentData, getSessionProof } from './agent-data.js'

export { AgentData }

const HOST = 'https://access.web3.storage'
const PRINCIPAL = DID.parse('did:web:web3.storage')

/**
 *
 * @param {string} email
 * @returns {Ucanto.Principal<Ucanto.DID<'mailto'>>}
 */
function emailToSessionPrincipal(email) {
  const parts = email.split('@').map((s) => encodeURIComponent(s))
  return DID.parse(`did:mailto:${parts[1]}:${parts[0]}`)
}

/**
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} issuer
 * @param {Ucanto.DID} space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @returns
 */
async function createIssuerSaysAccountCanAdminSpace(issuer, space, account) {
  return ucanto.delegate({
    issuer,
    audience: account,
    capabilities: [
      {
        can: 'space/*',
        with: space,
      },
      {
        can: 'store/*',
        with: space,
      },
      {
        can: 'upload/*',
        with: space,
      },
    ],
  })
}

/**
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} issuer
 * @param {Ucanto.DID} space
 * @param {Ucanto.Principal<Ucanto.DID<'key'>>} device
 */
async function createIssuerSaysDeviceCanAccessDelegateWithSpace(
  issuer,
  space,
  device
) {
  return ucanto.delegate({
    issuer,
    audience: device,
    capabilities: [
      {
        can: 'access/delegate',
        with: space,
      },
    ],
  })
}

/**
 * @typedef {import('./types').Service} Service
 */

/**
 * Creates a Ucanto connection for the w3access API
 *
 * Usage:
 *
 * ```js
 * import { connection } from '@web3-storage/access/agent'
 * ```
 *
 * @template {Ucanto.DID} T - DID method
 * @param {object} [options]
 * @param {Ucanto.Principal<T>} [options.principal] - w3access API Principal
 * @param {URL} [options.url] - w3access API URL
 * @param {Ucanto.Transport.Channel<Service>} [options.channel] - Ucanto channel to use
 * @param {typeof fetch} [options.fetch] - Fetch implementation to use
 * @returns {Ucanto.ConnectionView<Service>}
 */
export function connection(options = {}) {
  return Client.connect({
    id: options.principal ?? PRINCIPAL,
    encoder: CAR,
    decoder: CBOR,
    channel:
      options.channel ??
      HTTP.open({
        url: options.url ?? new URL(HOST),
        method: 'POST',
        fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      }),
  })
}

/**
 * Agent
 *
 * Usage:
 *
 * ```js
 * import { Agent } from '@web3-storage/access/agent'
 * ```
 */
export class Agent {
  /** @type {import('./agent-data').AgentData} */
  #data

  /**
   * @param {import('./agent-data').AgentData} data - Agent data
   * @param {import('./types').AgentOptions} [options]
   */
  constructor(data, options = {}) {
    /** @type { Client.Channel<Service> & { url?: URL } | undefined } */
    const channel = options.connection?.channel
    this.url = options.url ?? channel?.url ?? new URL(HOST)
    this.connection =
      options.connection ??
      connection({
        principal: options.servicePrincipal,
        url: this.url,
      })
    this.#data = data
  }

  /**
   * Create a new Agent instance, optionally with the passed initialization data.
   *
   * @param {Partial<import('./types').AgentDataModel>} [init]
   * @param {import('./types').AgentOptions & import('./types').AgentDataOptions} [options]
   */
  static async create(init, options = {}) {
    const data = await AgentData.create(init, options)
    return new Agent(data, options)
  }

  /**
   * Instantiate an Agent from pre-exported agent data.
   *
   * @param {import('./types').AgentDataExport} raw
   * @param {import('./types').AgentOptions & import('./types').AgentDataOptions} [options]
   */
  static from(raw, options = {}) {
    const data = AgentData.fromExport(raw, options)
    return new Agent(data, options)
  }

  get issuer() {
    return this.#data.principal
  }

  get meta() {
    return this.#data.meta
  }

  get spaces() {
    return this.#data.spaces
  }

  get account() {
    return this.#data.sessionPrincipal
  }

  did() {
    return this.#data.principal.did()
  }

  /**
   * Add a proof to the agent store
   *
   * A proof is a delegation with an audience matching agent DID
   *
   * @param {Ucanto.Delegation} delegation
   */
  async addProof(delegation) {
    validate(delegation, {
      checkAudience: this.issuer,
      checkIsExpired: true,
    })
    await this.#data.addDelegation(delegation, { audience: this.meta })
    await this.removeExpiredDelegations()
  }

  /**
   * Query the delegations store for all the delegations matching the capabilities provided.
   *
   * @param {import('@ucanto/interface').Capability[]} [caps]
   */
  #delegations(caps) {
    const _caps = new Set(caps)
    /** @type {Array<{ delegation: Ucanto.Delegation, meta: import('./types').DelegationMeta }>} */
    const values = []
    for (const [, value] of this.#data.delegations) {
      // check expiration
      if (
        !isExpired(value.delegation) && // check if delegation can be used
        !isTooEarly(value.delegation)
      ) {
        // check if we need to filter for caps
        if (Array.isArray(caps) && caps.length > 0) {
          for (const cap of _caps) {
            if (canDelegateCapability(value.delegation, cap)) {
              _caps.delete(cap)
              values.push(value)
            }
          }
        } else {
          values.push(value)
        }
      }
    }
    return values
  }

  /**
   * Clean up any expired delegations.
   */
  async removeExpiredDelegations() {
    for (const [, value] of this.#data.delegations) {
      if (isExpired(value.delegation)) {
        await this.#data.removeDelegation(value.delegation.cid)
      }
    }
  }

  /**
   * Get all the proofs matching the capabilities.
   *
   * Proofs are delegations with an audience matching agent DID, or with an
   * audience matching the session DID.
   *
   * Proof of session will also be included in the returned proofs if any
   * proofs matching the passed capabilities require it.
   *
   * @param {import('@ucanto/interface').Capability[]} [caps] - Capabilities to filter by. Empty or undefined caps with return all the proofs.
   */
  proofs(caps) {
    const arr = []
    const session = getSessionProof(this.#data)
    let hasSessionDelegations = false

    for (const { delegation } of this.#delegations(caps)) {
      const aud = delegation.audience
      if (
        aud.did() === this.issuer.did() ||
        aud.did() === session?.audience.did()
      ) {
        arr.push(delegation)
      }
      if (aud.did() === session?.audience.did()) {
        hasSessionDelegations = true
      }
    }

    if (session && hasSessionDelegations) {
      arr.push(session)
    }

    return arr
  }

  /**
   * Get delegations created by the agent for others.
   *
   * @param {import('@ucanto/interface').Capability[]} [caps] - Capabilities to filter by. Empty or undefined caps with return all the delegations.
   */
  delegations(caps) {
    const arr = []

    for (const { delegation } of this.delegationsWithMeta(caps)) {
      arr.push(delegation)
    }

    return arr
  }

  /**
   * Get delegations created by the agent for others and their metadata.
   *
   * @param {import('@ucanto/interface').Capability[]} [caps] - Capabilities to filter by. Empty or undefined caps with return all the delegations.
   */
  delegationsWithMeta(caps) {
    const arr = []

    for (const value of this.#delegations(caps)) {
      const { delegation } = value
      const isSession = delegation.capabilities.some(
        (c) => c.can === Access.session.can
      )
      if (!isSession && delegation.audience.did() !== this.issuer.did()) {
        arr.push(value)
      }
    }

    return arr
  }

  /**
   * Creates a space signer and a delegation to the agent
   *
   * @param {string} [name]
   */
  async createSpace(name) {
    const signer = await Signer.generate()
    const proof = await Space.top.delegate({
      issuer: signer,
      audience: this.issuer,
      with: signer.did(),
      expiration: Infinity,
    })

    /** @type {import('./types').SpaceMeta} */
    const meta = { isRegistered: false }
    // eslint-disable-next-line eqeqeq
    if (name != undefined) {
      if (typeof name !== 'string') {
        throw new TypeError('invalid name')
      }
      meta.name = name
    }

    await this.#data.addSpace(signer.did(), meta, proof)

    return {
      did: signer.did(),
      meta,
      proof,
    }
  }

  /**
   * Import a space from a '*' delegation
   *
   * @param {Ucanto.Delegation} delegation
   */
  async importSpaceFromDelegation(delegation) {
    if (delegation.capabilities[0].can !== '*') {
      throw new Error(
        'Space can only be import with full capabilities delegation.'
      )
    }

    const meta = /** @type {import('./types').SpaceMeta} */ (
      delegation.facts[0].space
    )
    const del = /** @type {Ucanto.Delegation<[import('./types').Top]>} */ (
      delegation
    )
    // @ts-ignore
    const did = Verifier.parse(del.capabilities[0].with).did()

    this.#data.spaces.set(did, meta)

    await this.addProof(del)

    return {
      did,
      meta,
      proof: del,
    }
  }

  /**
   *
   * @param {string} email
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async recover(email, opts) {
    const inv = await this.invokeAndExecute(Space.recoverValidation, {
      with: URI.from(this.did()),
      nb: { identity: URI.from(`mailto:${email}`) },
    })

    if (inv && inv.error) {
      throw new Error('Recover validation failed', { cause: inv })
    }

    const spaceRecover =
      /** @type {Ucanto.Delegation<[import('./types').SpaceRecover]>} */ (
        await this.#waitForDelegation(opts)
      )
    await this.addProof(spaceRecover)

    const recoverInv = await this.invokeAndExecute(Space.recover, {
      with: URI.from(this.connection.id.did()),
      nb: {
        identity: URI.from(`mailto:${email}`),
      },
    })

    if (recoverInv && recoverInv.error) {
      throw new Error('Spaces recover failed', { cause: recoverInv })
    }

    const dels = []
    for (const del of recoverInv) {
      dels.push(stringToDelegation(del))
    }

    return dels
  }

  /**
   * Sets the current selected space
   *
   * Other methods will default to use the current space if no resource is defined
   *
   * @param {Ucanto.DID<'key'>} space
   */
  async setCurrentSpace(space) {
    const proofs = this.proofs([
      {
        can: 'space/info',
        with: space,
      },
    ])

    if (proofs.length === 0) {
      throw new Error(`Agent has no proofs for ${space}.`)
    }

    await this.#data.setCurrentSpace(space)

    return space
  }

  /**
   * Get current space DID
   */
  currentSpace() {
    return this.#data.currentSpace
  }

  /**
   * Get current space DID, proofs and abilities
   */
  currentSpaceWithMeta() {
    if (!this.#data.currentSpace) {
      return
    }

    // TODO cache these
    const proofs = this.proofs([
      {
        can: 'space/info',
        with: this.#data.currentSpace,
      },
    ])

    const caps = new Set()
    for (const p of proofs) {
      for (const cap of p.capabilities) {
        caps.add(cap.can)
      }
    }

    return {
      did: this.#data.currentSpace,
      proofs,
      capabilities: [...caps],
      meta: this.#data.spaces.get(this.#data.currentSpace),
    }
  }

  /**
   * Request authorization of a session allowing this agent to issue UCANs
   * signed by the passed email address.
   *
   * @param {string} email
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async authorize(email, opts) {
    const sessionPrincipal = emailToSessionPrincipal(email)

    const res = await this.invokeAndExecute(Access.authorize, {
      audience: this.connection.id,
      with: this.issuer.did(),
      nb: {
        iss: sessionPrincipal.did(),
        att: [{ can: 'store/*' }, { can: 'provider/add' }, { can: 'upload/*' }],
      },
    })

    if (res?.error) {
      throw new Error('failed to authorize session', { cause: res })
    }

    const sessionDelegation =
      /** @type {Ucanto.Delegation<[import('./types').AccessSession]>} */
      (await this.#waitForDelegation(opts))

    const cap = sessionDelegation.capabilities.find(
      // @ts-expect-error "key" does not exist in object, unless it's a session capability
      (c) => c.can === Access.session.can && c.nb.key === this.issuer.did()
    )
    if (!cap && isExpired(sessionDelegation)) {
      throw new Error('received invalid delegation')
    }

    await this.addProof(sessionDelegation)
    this.#data.setSessionPrincipal(sessionPrincipal)

    // claim delegations here because we will need an ucan/attest from the service to
    // pair with the session delegation we just claimed to make it work
    await this.claimDelegations()
  }

  async claimDelegations() {
    const res = await this.invokeAndExecute(Access.claim, {
      audience: this.connection.id,
      with: this.issuer.did(),
    })
    if (res.error) {
      throw new Error('error claiming delegations')
    }
    const delegations = Object.values(res.delegations).flatMap((bytes) =>
      bytesToDelegations(bytes)
    )
    for (const delegation of delegations) {
      this.addProof(delegation)

      // if we can find a store/* capability in this delegation, look in the proofs
      // for the concrete capabilities where space DIDs will be specified
      // TODO: this was my first attempt at inferring spaces from claimed delegations, but I think it needs work - tv
      // if (delegation.capabilities.some((cap) => cap.can === 'store/*')) {
      //   const spaceListingProof = delegation.proofs.find((del) =>
      //     del.capabilities.some((cap) => cap.can === 'store/list')
      //   )
      //   const spaceListingCap = spaceListingProof.capabilities.find(
      //     (cap) => cap.can === 'store/list'
      //   )
      //   if (spaceListingCap) {
      //     this.#data.addSpace(
      //       spaceListingCap.with,
      //       { isRegistered: true },
      //       delegation
      //     )
      //   }
      // }
    }

    // TODO: should we be inferring which spaces we have access to here and updating local space state?

    return delegations
  }

  /**
   * @param {Ucanto.DID<'key'>} space
   */
  async addProvider(space) {
    const sessionPrincipal = this.#data.sessionPrincipal

    if (!sessionPrincipal) {
      throw new Error('cannot add provider, please authorize first')
    }

    return this.invokeAndExecute(Provider.add, {
      audience: this.connection.id,
      with: sessionPrincipal.did(),
      proofs: this.proofs([
        {
          can: 'provider/add',
          with: sessionPrincipal.did(),
        },
      ]),
      nb: {
        // TODO probably need to make it possible to pass other providers in
        provider: 'did:web:staging.web3.storage',
        consumer: space,
      },
    })
  }

  /**
   *
   * @param {Ucanto.DID<'key'>} space
   */
  async delegateSpaceAccessToAccount(space) {
    const sessionPrincipal = this.#data.sessionPrincipal

    if (!sessionPrincipal) {
      throw new Error(
        'cannot add delegate space access to account, please authorize first'
      )
    }

    const spaceSaysAccountCanAdminSpace =
      await createIssuerSaysAccountCanAdminSpace(
        this.issuer,
        space,
        sessionPrincipal
      )
    return this.invokeAndExecute(Access.delegate, {
      audience: this.connection.id,
      with: space,
      expiration: Infinity,
      nb: {
        delegations: {
          [spaceSaysAccountCanAdminSpace.cid.toString()]:
            spaceSaysAccountCanAdminSpace.cid,
        },
      },
      proofs: [
        await createIssuerSaysDeviceCanAccessDelegateWithSpace(
          this.issuer,
          space,
          this.issuer
        ),
        // must be embedded here because it's referenced by cid in .nb.delegations
        spaceSaysAccountCanAdminSpace,
      ],
    })
  }

  /**
   * Invokes voucher/redeem for the free tier, wait on the websocket for the voucher/claim and invokes it
   *
   * It also adds a full space delegation to the service in the voucher/claim invocation to allow for recovery
   *
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async registerSpace(opts) {
    const space = this.currentSpace()
    const spaceMeta = space ? this.#data.spaces.get(space) : undefined

    if (!space || !spaceMeta) {
      throw new Error('No space selected')
    }

    if (spaceMeta && spaceMeta.isRegistered) {
      throw new Error('Space already registered with web3.storage.')
    }
    const providerResult = await this.addProvider(
      /** @type {Ucanto.DID<'key'>} */ (space)
    )
    if (providerResult.error) {
      throw new Error(providerResult.message, { cause: providerResult })
    }
    const delegateSpaceAccessResult = await this.delegateSpaceAccessToAccount(
      space
    )
    if (delegateSpaceAccessResult.error) {
      // @ts-ignore it's very weird that this is throwing an error but line 692 above does not - ignore for now
      throw new Error(delegateSpaceAccessResult.message, {
        cause: delegateSpaceAccessResult,
      })
    }
    spaceMeta.isRegistered = true
    this.#data.addSpace(space, spaceMeta)
  }

  /**
   *
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async #waitForDelegation(opts) {
    const ws = new Websocket(this.url, `validate-ws/${this.currentSpace()}`)
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
        const delegation = stringToDelegation(msg.delegation)
        ws.close()
        return delegation
      }
    } catch (error) {
      if (error instanceof AbortError) {
        await ws.close()
        throw new TypeError('Failed to get delegation', { cause: error })
      }
    }
    throw new TypeError('Failed to get delegation')
  }

  /**
   *
   * @param {import('./types').DelegationOptions} options
   */
  async delegate(options) {
    const space = this.currentSpaceWithMeta()
    if (!space) {
      throw new Error('there no space selected.')
    }

    const caps = /** @type {Ucanto.Capabilities} */ (
      options.abilities.map((a) => {
        return {
          with: space.did,
          can: a,
        }
      })
    )

    const delegation = await delegate({
      issuer: this.issuer,
      capabilities: caps,
      proofs: this.proofs(caps),
      facts: [{ space: space.meta }],
      ...options,
    })

    await this.#data.addDelegation(delegation, {
      audience: options.audienceMeta,
    })
    await this.removeExpiredDelegations()

    return delegation
  }

  /**
   * Invoke and execute the given capability on the Access service connection
   *
   * ```js
   *
   * await agent.invokeAndExecute(Space.recover, {
   *   nb: {
   *     identity: 'mailto: email@gmail.com',
   *   },
   * })
   *
   * // sugar for
   * const recoverInvocation = await agent.invoke(Space.recover, {
   *   nb: {
   *     identity: 'mailto: email@gmail.com',
   *   },
   * })
   *
   * await recoverInvocation.execute(agent.connection)
   * ```
   *
   * @type {import('./types').InvokeAndExecute}
   * @template {Ucanto.Ability} A
   * @template {Ucanto.URI} R
   * @template {Ucanto.Caveats} C
   * @param {Ucanto.TheCapabilityParser<Ucanto.CapabilityMatch<A, R, C>>} cap
   * @param {import('./types').InvokeOptions<A, R, Ucanto.TheCapabilityParser<Ucanto.CapabilityMatch<A, R, C>>>} options
   */
  async invokeAndExecute(cap, options) {
    const inv = await this.invoke(cap, options)

    // @ts-ignore
    const out = inv.execute(this.connection)

    return /** @type {Promise<Ucanto.InferServiceInvocationReturn<Ucanto.InferInvokedCapability<Ucanto.TheCapabilityParser<Ucanto.CapabilityMatch<A, R, C>>>, import('./types').Service>>} */ (
      out
    )
  }

  /**
   * Execute invocations on the agent's connection
   *
   * @example
   * ```js
   * const i1 = await agent.invoke(Space.info, {})
   * const i2 = await agent.invoke(Space.recover, {
   *   nb: {
   *     identity: 'mailto:hello@web3.storage',
   *   },
   * })
   *
   * const results = await agent.execute2(i1, i2)
   *
   * ```
   * @template {Ucanto.Capability} C
   * @template {Ucanto.Tuple<Ucanto.ServiceInvocation<C, import('./types').Service>>} I
   * @param {I} invocations
   */
  execute(...invocations) {
    return this.connection.execute(...invocations)
  }

  /**
   * Creates an invocation for the given capability with Agent's proofs, service, issuer and space.
   *
   * @example
   * ```js
   * const recoverInvocation = await agent.invoke(Space.recover, {
   *   nb: {
   *     identity: 'mailto: email@gmail.com',
   *   },
   * })
   *
   * await recoverInvocation.execute(agent.connection)
   * // or
   * await agent.execute(recoverInvocation)
   * ```
   *
   * @template {Ucanto.Ability} A
   * @template {Ucanto.URI} R
   * @template {Ucanto.TheCapabilityParser<Ucanto.CapabilityMatch<A, R, C>>} CAP
   * @template {Ucanto.Caveats} [C={}]
   * @param {CAP} cap
   * @param {import('./types').InvokeOptions<A, R, CAP>} options
   */
  async invoke(cap, options) {
    const space = options.with || this.currentSpace()
    if (!space) {
      throw new Error(
        'No space or resource selected, you need pass a resource.'
      )
    }

    const extraProofs = options.proofs || []
    const proofs = this.proofs([
      {
        with: space,
        can: cap.can,
      },
    ])

    if (
      proofs.length === 0 &&
      options.with !== this.did() &&
      extraProofs.length === 0
    ) {
      throw new Error(
        `no proofs available for resource ${space} and ability ${cap.can} and no extra proofs were provided`
      )
    }
    const inv = invoke({
      ...options,
      audience: options.audience || this.connection.id,
      // @ts-ignore
      capability: cap.create({
        with: space,
        nb: options.nb,
      }),
      issuer: this.issuer,
      proofs: [...proofs, ...extraProofs],
    })

    return /** @type {Ucanto.IssuedInvocationView<Ucanto.InferInvokedCapability<CAP>>} */ (
      inv
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
   * Get Space information from Access service
   *
   * @param {Ucanto.URI<"did:">} [space]
   */
  async getSpaceInfo(space) {
    const _space = space || this.currentSpace()
    if (!_space) {
      throw new Error('No space selected, you need pass a resource.')
    }
    const inv = await this.invokeAndExecute(Space.info, {
      with: _space,
    })

    if (inv.error) {
      throw inv
    }

    return inv
  }
}
