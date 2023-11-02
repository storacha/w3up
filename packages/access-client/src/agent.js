/* eslint-disable max-depth */
import * as Client from '@ucanto/client'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as CAR from '@ucanto/transport/car'
import * as HTTP from '@ucanto/transport/http'
import * as ucanto from '@ucanto/core'
import * as Capabilities from '@web3-storage/capabilities/space'
import { attest } from '@web3-storage/capabilities/ucan'
import * as Access from './access.js'
import * as Space from './space.js'

import { invoke, delegate, DID, Delegation } from '@ucanto/core'
import {
  isExpired,
  isTooEarly,
  validate,
  canDelegateCapability,
} from './delegations.js'
import { AgentData, getSessionProofs } from './agent-data.js'
import { Provider, UCAN } from '@web3-storage/capabilities'

import * as API from './types.js'

// eslint-disable-next-line import/export
export * from './types.js'
export * from './delegations.js'
export { AgentData, Access, Space, Delegation }
export * from './agent-use-cases.js'

const HOST = 'https://up.web3.storage'
const PRINCIPAL = DID.parse('did:web:web3.storage')

/**
 * Keeps track of AgentData for all Agents constructed.
 * Used by
 * * addSpacesFromDelegations - so it can only accept Agent as param, but still mutate corresponding AgentData
 *
 * @deprecated - remove this when deprecated addSpacesFromDelegations is removed
 */
/** @type {WeakMap<Agent<Record<string, any>>, AgentData>} */
const agentToData = new WeakMap()

/**
 * @typedef {API.Service} Service
 * @typedef {API.Receipt<any, any>} Receipt
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
 * @template {API.DID} T - DID method
 * @template {Record<string, any>} [S=Service]
 * @param {object} [options]
 * @param {API.Principal<T>} [options.principal] - w3access API Principal
 * @param {URL} [options.url] - w3access API URL
 * @param {API.Transport.Channel<S>} [options.channel] - Ucanto channel to use
 * @param {typeof fetch} [options.fetch] - Fetch implementation to use
 * @returns {API.ConnectionView<S>}
 */
export function connection(options = {}) {
  return Client.connect({
    id: options.principal ?? PRINCIPAL,
    codec: CAR.outbound,
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
 *
 * @template {Record<string, any>} [S=Service]
 */
export class Agent {
  /** @type {import('./agent-data.js').AgentData} */
  #data

  /**
   * @param {import('./agent-data.js').AgentData} data - Agent data
   * @param {import('./types.js').AgentOptions<S>} [options]
   */
  constructor(data, options = {}) {
    /** @type { Client.Channel<S> & { url?: URL } | undefined } */
    const channel = options.connection?.channel
    this.url = options.url ?? channel?.url ?? new URL(HOST)
    this.connection =
      options.connection ??
      connection({
        principal: options.servicePrincipal,
        url: this.url,
      })
    this.#data = data
    agentToData.set(this, this.#data)
  }

  /**
   * Create a new Agent instance, optionally with the passed initialization data.
   *
   * @template {Record<string, any>} [R=Service]
   * @param {Partial<import('./types.js').AgentDataModel>} [init]
   * @param {import('./types.js').AgentOptions<R> & import('./types.js').AgentDataOptions} [options]
   */
  static async create(init, options = {}) {
    const data = await AgentData.create(init, options)
    return new Agent(data, options)
  }

  /**
   * Instantiate an Agent from pre-exported agent data.
   *
   * @template {Record<string, any>} [R=Service]
   * @param {import('./types.js').AgentDataExport} raw
   * @param {import('./types.js').AgentOptions<R> & import('./types.js').AgentDataOptions} [options]
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

  did() {
    return this.#data.principal.did()
  }

  /**
   * Add a proof to the agent store
   *
   * A proof is a delegation with an audience matching agent DID
   *
   * @param {API.Delegation} delegation
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
   * @param {API.CapabilityQuery[]} [caps]
   */
  #delegations(caps) {
    const _caps = new Set(caps)
    /** @type {Array<{ delegation: API.Delegation, meta: API.DelegationMeta }>} */
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
   * Revoke a delegation by CID.
   *
   * If the delegation was issued by this agent (and therefore is stored in the
   * delegation store) you can just pass the CID. If not, or if the current agent's
   * delegation store no longer contains the delegation, you MUST pass a chain of
   * proofs that proves your authority to revoke this delegation as `options.proofs`.
   *
   * @param {API.UCANLink} delegationCID
   * @param {object} [options]
   * @param {API.Delegation[]} [options.proofs]
   */
  async revoke(delegationCID, options = {}) {
    const additionalProofs = options.proofs ?? []
    // look for the identified delegation in the delegation store and the passed proofs
    const delegation = [...this.delegations(), ...additionalProofs].find(
      (delegation) => delegation.cid.equals(delegationCID)
    )
    if (!delegation) {
      return {
        error: new Error(
          `could not find delegation ${delegationCID.toString()} - please include the delegation in options.proofs`
        ),
      }
    }
    const receipt = await this.invokeAndExecute(UCAN.revoke, {
      // per https://github.com/web3-storage/w3up/blob/main/packages/capabilities/src/ucan.js#L38C6-L38C6 the resource here should be
      // the current issuer - using the space DID here works for simple cases but falls apart when a delegee tries to revoke a delegation
      // they have re-delegated, since they don't have "ucan/revoke" capabilities on the space
      with: this.issuer.did(),
      nb: {
        ucan: delegation.cid,
      },
      proofs: [delegation, ...additionalProofs],
    })
    return receipt.out
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
   * @param {import('@ucanto/interface').Capability[]|undefined} [caps] - Capabilities to filter by. Empty or undefined caps with return all the proofs.
   * @param {object} [options]
   * @param {API.DID} [options.sessionProofIssuer] - only include session proofs for this issuer
   */
  proofs(caps, options) {
    const authorizations = []
    for (const { delegation } of this.#delegations(caps)) {
      if (delegation.audience.did() === this.issuer.did()) {
        authorizations.push(delegation)
      }
    }

    // now let's add any session proofs that refer to those authorizations
    const sessions = getSessionProofs(this.#data)
    for (const proof of authorizations) {
      const proofsByIssuer = sessions[proof.asCID.toString()] ?? {}
      const sessionProofs = options?.sessionProofIssuer
        ? proofsByIssuer[options.sessionProofIssuer] ?? []
        : Object.values(proofsByIssuer).flat()
      if (sessionProofs.length) {
        authorizations.push(...sessionProofs)
      }
    }
    return authorizations
  }

  /**
   * Get delegations created by the agent for others.
   *
   * @param {API.CapabilityQuery[]} [caps] - Capabilities to filter by. Empty or undefined caps with return all the delegations.
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
   * @param {API.CapabilityQuery[]} [caps] - Capabilities to filter by. Empty or undefined caps with return all the delegations.
   */
  delegationsWithMeta(caps) {
    const arr = []

    for (const value of this.#delegations(caps)) {
      const { delegation } = value
      const isSession = delegation.capabilities.some(
        (c) => c.can === attest.can
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
   * @param {string} name
   */
  async createSpace(name) {
    return await Space.generate({ name })
  }

  //   const signer = await Signer.generate()
  //   const proof = await Capabilities.top.delegate({
  //     issuer: signer,
  //     audience: this.issuer,
  //     with: signer.did(),
  //     expiration: Infinity,
  //   })

  //   /** @type {import('./types.js').SpaceMeta} */
  //   const meta = { isRegistered: false }
  //   // eslint-disable-next-line eqeqeq
  //   if (name != undefined) {
  //     if (typeof name !== 'string') {
  //       throw new TypeError('invalid name')
  //     }
  //     meta.name = name
  //   }

  //   await this.#data.addSpace(signer.did(), meta, proof)

  //   return {
  //     did: signer.did(),
  //     meta,
  //     proof,
  //   }
  // }

  /**
   * Import a space from a delegation.
   *
   * @param {API.Delegation} delegation
   * @param {object} options
   * @param {string} [options.name]
   */
  async importSpaceFromDelegation(delegation, { name = '' } = {}) {
    const space =
      name === ''
        ? Space.fromDelegation(delegation)
        : Space.fromDelegation(delegation).withName(name)

    if (space.name === '') {
      throw new Error(
        'Space has no name please pass `option.name` to specify it'
      )
    }

    this.#data.spaces.set(space.did(), { ...space.meta, name: space.name })

    await this.addProof(space.delegation)

    return space
  }

  /**
   * Sets the current selected space
   *
   * Other methods will default to use the current space if no resource is defined
   *
   * @param {API.SpaceDID} space
   */
  async setCurrentSpace(space) {
    if (!this.#data.spaces.has(space)) {
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
   * @param {object} options
   * @param {API.AccountDID} options.account
   * @param {API.SpaceDID} options.space
   * @param {API.ProviderDID} [options.provider]
   */
  async provisionSpace({ account, provider, space }) {
    return provisionSpace(this, { account, provider, space })
  }

  // /**
  //  * Requests a subscription from a provider and attaches it to a space.
  //  *
  //  * It also adds a full space delegation to the service that can later
  //  * be claimed by the currently authorized account to restore access to the space.
  //  *
  //  * @param {string} email
  //  * @param {object} [opts]
  //  * @param {AbortSignal} [opts.signal]
  //  * @param {Ucanto.DID<'key'>} [opts.space] - space to register
  //  * @param {Ucanto.DID<'web'>} [opts.provider] - provider to register - defaults to this.connection.id
  //  */
  // async registerSpace(email, opts = {}) {
  //   return await addProviderAndDelegateToAccount(this, this.#data, email, opts)
  // }

  /**
   *
   * @param {import('./types.js').DelegationOptions} options
   */
  async delegate(options) {
    const space = this.currentSpaceWithMeta()
    if (!space) {
      throw new Error('no space selected.')
    }

    const caps = /** @type {API.Capabilities} */ (
      options.abilities.map((a) => {
        return {
          with: space.did,
          can: a,
        }
      })
    )

    // Verify agent can provide proofs for each requested capability
    for (const cap of caps) {
      if (!this.proofs([cap]).length) {
        throw new Error(
          `cannot delegate capability ${cap.can} with ${cap.with}`
        )
      }
    }

    const delegation = await delegate({
      issuer: this.issuer,
      capabilities: caps,
      proofs: this.proofs(caps),
      facts: [{ space: space.meta ?? {} }],
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
   * @template {API.Ability} A
   * @template {API.URI} R
   * @template {API.Caveats} C
   * @param {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>} cap
   * @param {API.InvokeOptions<A, R, API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>>} options
   * @returns {Promise<API.InferReceipt<API.Capability<A, R, C>, S>>}
   */
  async invokeAndExecute(cap, options) {
    const inv = await this.invoke(cap, options)
    const out = inv.execute(/** @type {*} */ (this.connection))
    return /** @type {*} */ (out)
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
   * @template {API.Capability} C
   * @template {API.Tuple<API.ServiceInvocation<C, S>>} I
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
   * @template {API.Ability} A
   * @template {API.URI} R
   * @template {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>} CAP
   * @template {API.Caveats} [C={}]
   * @param {CAP} cap
   * @param {import('./types.js').InvokeOptions<A, R, CAP>} options
   */
  async invoke(cap, options) {
    const audience = options.audience || this.connection.id

    const space = options.with || this.currentSpace()
    if (!space) {
      throw new Error(
        'No space or resource selected, you need pass a resource.'
      )
    }

    const proofs = [
      ...(options.proofs || []),
      ...this.proofs(
        [
          {
            with: space,
            can: cap.can,
          },
        ],
        { sessionProofIssuer: audience.did() }
      ),
    ]

    if (proofs.length === 0 && options.with !== this.did()) {
      throw new Error(
        `no proofs available for resource ${space} and ability ${cap.can}`
      )
    }
    const inv = invoke({
      ...options,
      audience,
      // @ts-ignore
      capability: cap.create({
        with: space,
        nb: options.nb,
      }),
      issuer: this.issuer,
      proofs: [...proofs],
    })

    return /** @type {API.IssuedInvocationView<API.InferInvokedCapability<CAP>>} */ (
      inv
    )
  }

  /**
   * Get Space information from Access service
   *
   * @param {API.URI<"did:">} [space]
   */
  async getSpaceInfo(space) {
    const _space = space || this.currentSpace()
    if (!_space) {
      throw new Error('No space selected, you need pass a resource.')
    }
    const inv = await this.invokeAndExecute(Capabilities.info, {
      with: _space,
    })

    if (inv.out.error) {
      throw inv.out.error
    }

    return /** @type {import('./types.js').SpaceInfoResult} */ (inv.out.ok)
  }
}

/**
 * Given a list of delegations, add to agent data spaces list.
 *
 * @deprecated - trying to remove explicit space tracking from Agent/AgentData
 * in favor of functions that derive the space set from access.delegations
 *
 * @template {Record<string, any>} [S=Service]
 * @param {Agent<S>} access
 * @param {API.Delegation[]} delegations
 */
export async function addSpacesFromDelegations(access, delegations) {
  const data = agentToData.get(access)
  if (!data) {
    throw Object.assign(new Error(`cannot determine AgentData for Agent`), {
      agent: access,
    })
  }
  // TODO: we need a more robust way to determine which spaces a user has access to
  // it may or may not involve look at delegations
  if (delegations.length > 0) {
    const allows = ucanto.Delegation.allows(
      .../** @type {API.Tuple<API.Delegation>} */ (delegations)
    )

    for (const [did, value] of Object.entries(allows)) {
      // If we discovered a delegation to any DID, we add it to the spaces list.
      if (did.startsWith('did:key') && Object.keys(value).length > 0) {
        data.addSpace(/** @type {API.DID} */ (did), {
          name: '',
        })
      }
    }
  }
}

const DIDWeb = ucanto.Schema.DID.match({ method: 'web' })

/**
 * @template {Record<string, any>} [S=Service]
 * @param {Agent<S>} agent
 * @param {object} input
 * @param {API.AccountDID} input.account
 * @param {API.SpaceDID} [input.space]
 * @param {API.ProviderDID} [input.provider]
 */
export const provisionSpace = async (
  agent,
  {
    account,
    space = agent.currentSpace(),
    provider = /** @type {API.ProviderDID} */ (agent.connection.id.did()),
  }
) => {
  if (!DIDWeb.is(provider)) {
    throw new Error(
      `Unable to determine provider from agent.connection.id did ${provider}. expected a did:web:`
    )
  }

  if (!space) {
    throw new Error('No space selected')
  }

  const { out } = await agent.invokeAndExecute(Provider.add, {
    with: account,
    nb: {
      provider,
      consumer: space,
    },
  })

  return out
}
