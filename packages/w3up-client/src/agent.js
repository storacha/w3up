// import * as Client from '@ucanto/client'
// import * as CAR from '@ucanto/transport/car'
// import * as HTTP from '@ucanto/transport/http'
import * as DB from './agent/db.js'
import { Signer, ed25519 } from '@ucanto/principal'
import { DID } from '@ucanto/core'

import * as API from './types.js'
import * as Session from './session.js'
import * as Connection from './agent/connection.js'

export * from './types.js'

export { DB, Connection, DID }

/**
 * @type {API.DataStore}
 */
export const ephemeral = {
  open: async () => {},
  close: async () => {},
  save: async () => {},
  /**
   *
   * @returns {Promise<API.DatabaseArchive|undefined>}
   */
  load: async () => {
    return undefined
  },
  reset: async () => {},
}

/**
 * @param {API.W3UpOpen} source
 * @returns {AgentPromise}
 */
export const open = (source) => AgentPromise.from(Agent.open(source))

/**
 * @param {API.W3Load} source
 */
export const load = (source) => AgentPromise.from(Agent.load(source))

/**
 * @param {API.W3Create} source
 */
export const create = (source) => AgentPromise.from(Agent.create(source))

/**
 * @extends {Promise<API.Result<API.AgentView, API.ConnectError>>}
 */
class AgentPromise extends Promise {
  /**
   *
   * @param {Promise<API.Result<API.AgentView, API.ConnectError>>} promise
   * @returns {AgentPromise}
   */
  static from(promise) {
    return new AgentPromise((resolve, reject) => promise.then(resolve, reject))
  }
  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.ConnectionView<Protocol>} [connection]
   * @returns {Promise<API.Result<API.Session<Protocol>, API.ConnectError>>}
   */
  async connect(connection) {
    const result = await this
    if (result.ok) {
      return result.ok.connect(connection)
    } else {
      return result
    }
  }
}

/**
 * @implements {API.AgentView}
 */
class Agent {
  /**
   * @param {object} source
   * @param {API.Signer} source.signer
   * @param {API.Database} source.db
   */
  constructor(source) {
    this.model = source
  }

  did() {
    return this.model.signer.did()
  }

  get signer() {
    return this.model.signer
  }

  get db() {
    return this.model.db
  }

  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.Connection<Protocol>} [connection]
   * @returns {Promise<API.Result<API.Session<Protocol>, API.SignerLoadError>>}
   */
  async connect(connection = Connection.open()) {
    return {
      ok: Session.create({ agent: this, connection }),
    }
  }
  /**
   * @param {API.W3Create} source
   */
  static async create({ store, as }) {
    const { ok: db, error } = await DB.open({ store })
    if (error) {
      return { error }
    }
    const signer = as ?? (await ed25519.generate())
    const archive = signer.toArchive()
    const result = await DB.transact(db, [{ signer: archive }])
    if (result.error) {
      return result
    }

    return { ok: new Agent({ db, signer }) }
  }
  /**
   * @param {API.W3Load} source
   * @returns {Promise<API.Result<Agent, API.SignerLoadError|API.DataStoreOpenError>>}
   */
  static async load({ store, as }) {
    const { ok: db, error } = await DB.open({ store })
    if (error) {
      return { error }
    }

    if (as != null) {
      return { ok: new Agent({ db, signer: as }) }
    } else if (db?.signer != null) {
      const signer = Signer.from(
        /** @type {API.SignerArchive<API.DID, any>} */ (db.signer)
      )

      return { ok: new Agent({ db, signer }) }
    } else {
      return {
        error: new SignerLoadError(
          'Signer key material is not stored in storage'
        ),
      }
    }
  }
  /**
   * @param {API.W3UpOpen} source
   * @returns {Promise<API.Result<Agent, API.SignerLoadError|API.DataStoreOpenError|API.DataStoreSaveError|API.DatabaseTransactionError>>}
   */
  static async open({ store, as }) {
    const { ok: db, error } = await DB.open({ store })
    if (error) {
      return { error }
    }

    if (as) {
      return { ok: new Agent({ db, signer: as }) }
    } else if (db.signer) {
      return {
        ok: new Agent({
          signer: Signer.from(db.signer),
          db,
        }),
      }
    } else {
      const signer = await ed25519.generate()

      const { error } = await DB.transact(db, [{ signer: signer.toArchive() }])
      if (error) {
        return { error }
      } else {
        return {
          ok: new Agent({ db, signer }),
        }
      }
    }
  }
}

class SignerLoadError extends Error {
  name = /** @type {const} */ ('SignerLoadError')
}

// /**
//  * Keeps track of AgentData for all Agents constructed.
//  * Used by addSpacesFromDelegations - so it can only accept Agent as param, but
//  * still mutate corresponding AgentData
//  *
//  * @deprecated - remove this when deprecated addSpacesFromDelegations is removed
//  */
// /** @type {WeakMap<Agent<Record<string, any>>, AgentData>} */
// const agentToData = new WeakMap()

/**
 * @typedef {API.Service} Service
 * @typedef {API.Receipt<any, any>} Receipt
 */

// /**
//  * @template {Record<string, any>} [Protocol={}]
//  * @typedef {object} Model
//  * @property {API.AgentMeta} meta
//  * @property {Connection.Model<Protocol>} connection
//  * @property {API.Signer} principal
//  * @property {API.Storage<API.AgentDataExport>} store
//  * @property {DB.DB} db
//  * @property {URL} [receiptsEndpoint]
//  */

// /**
//  * @typedef {object} Archive
//  * @property {Connection.Archive} connection
//  * @property {API.AgentMeta} meta
//  * @property {API.SignerArchive<API.DID, any>} principal
//  * @property {API.DatabaseArchive} delegations
//  * @property {API.DIDKey} [currentSpace]
//  */

// /**
//  * @param {Model} model
//  * @returns {Archive}
//  */
// export const toArchive = (model) => {
//   return {
//     connection: Connection.toArchive(model.connection),
//     meta: model.meta,
//     principal: model.principal.toArchive(),
//     delegations: DB.toArchive(model.db),
//   }
// }

// /**
//  * @template {Record<string, any>} [Service={}]
//  * @typedef {object} AgentModel
//  * @property {AgentData} data
//  * @property {API.ConnectionView<Service>} connection
//  */

// /**
//  * @template {Record<string, any>} Protocol
//  * @param {object} source
//  * @param {API.DataStore<API.AgentDataExport>} source.store
//  * @param {API.ConnectionView<Protocol>} source.connection
//  * @param {URL} [source.receiptsEndpoint]
//  * @returns {Agent<Protocol>}
//  */
// export const from = (source) => new Agent(source.data, source)

// /**
//  * Agent
//  *
//  * Usage:
//  *
//  * ```js
//  * import { Agent } from '@web3-storage/w3up-client'
//  * ```
//  *
//  * @template {Record<string, any>} [S=Record<string, unknown>] - Service
//  */
// export class ExAgent {
//   /** @type {AgentData} */
//   #data

//   /**
//    * @param {AgentData} data - Agent data
//    * @param {API.AgentOptions<S>} [options]
//    */
//   constructor(data, options = {}) {
//     /** @type { Client.Channel<S> & { url?: URL } | undefined } */
//     const channel = options.connection?.channel
//     this.url = options.url ?? channel?.url ?? new URL(HOST)
//     this.connection =
//       options.connection ??
//       connection({
//         principal: options.servicePrincipal,
//         url: this.url,
//       })
//     this.receiptsEndpoint = options.receiptsEndpoint ?? Config.receiptsEndpoint
//     this.#data = data
//     agentToData.set(this, this.#data)
//   }

//   get data() {
//     return this.#data
//   }

//   /**
//    * Create a new Agent instance, optionally with the passed initialization data.
//    *
//    * @template {Record<string, any>} [R=Service]
//    * @param {Partial<API.AgentDataModel>} [init]
//    * @param {API.AgentOptions<R> & API.AgentDataOptions} [options]
//    */
//   static async create(init, options = {}) {
//     const data = await AgentData.create(init, options)
//     return new Agent(data, options)
//   }

//   /**
//    * Instantiate an Agent from pre-exported agent data.
//    *
//    * @template {Record<string, any>} [R=Service]
//    * @param {API.AgentDataExport} raw
//    * @param {API.AgentOptions<R> & API.AgentDataOptions} [options]
//    */
//   static from(raw, options = {}) {
//     const data = AgentData.fromExport(raw, options)
//     return new Agent(data, options)
//   }

//   get issuer() {
//     return this.#data.principal
//   }

//   get meta() {
//     return this.#data.meta
//   }

//   get spaces() {
//     return this.#data.spaces
//   }

//   did() {
//     return this.#data.principal.did()
//   }

//   /**
//    * Import a space from a delegation.
//    *
//    * @param {API.Delegation} delegation
//    * @param {object} options
//    * @param {string} [options.name]
//    */
//   async importSpaceFromDelegation(delegation, { name = '' } = {}) {
//     const space =
//       name === ''
//         ? Space.fromDelegation(delegation)
//         : Space.fromDelegation(delegation).withName(name)

//     this.#data.spaces.set(space.did(), { ...space.meta, name: space.name })

//     await addProofs(this.#data, space.proofs)

//     // if we do not have a current space, make this one current
//     if (!this.#data.currentSpace) {
//       await this.#data.setCurrentSpace(space.did())
//     }

//     return space
//   }

//   /**
//    * Execute invocations on the agent's connection
//    *
//    * @example
//    * ```js
//    * const i1 = await agent.invoke(Space.info, {})
//    * const i2 = await agent.invoke(Space.recover, {
//    *   nb: {
//    *     identity: 'mailto:hello@web3.storage',
//    *   },
//    * })
//    *
//    * const results = await agent.execute2(i1, i2)
//    *
//    * ```
//    * @template {API.Capability} C
//    * @template {API.Tuple<API.ServiceInvocation<C, S>>} I
//    * @param {I} invocations
//    */
//   execute(...invocations) {
//     return this.connection.execute(...invocations)
//   }
// }

// /**
//  * Given a list of delegations, add to agent data spaces list.
//  *
//  * @deprecated - trying to remove explicit space tracking from Agent/AgentData
//  * in favor of functions that derive the space set from access.delegations
//  *
//  * @template {Record<string, any>} [S=Service]
//  * @param {Agent<S>} agent
//  * @param {API.Delegation[]} delegations
//  */
// export async function addSpacesFromDelegations(agent, delegations) {
//   const data = agentToData.get(agent)
//   if (!data) {
//     throw Object.assign(new Error(`cannot determine AgentData for Agent`), {
//       agent: agent,
//     })
//   }

//   // spaces we find along the way.
//   const spaces = new Map()
//   // only consider ucans with this agent as the audience
//   const ours = delegations.filter((x) => x.audience.did() === agent.did())
//   // space names are stored as facts in proofs in the special `ucan:*` delegation from email to agent.
//   const ucanStars = ours.filter(
//     (x) => x.capabilities[0].can === '*' && x.capabilities[0].with === 'ucan:*'
//   )
//   for (const delegation of ucanStars) {
//     for (const proof of delegation.proofs) {
//       if (
//         !isDelegation(proof) ||
//         !proof.capabilities[0].with.startsWith('did:key')
//       ) {
//         continue
//       }
//       const space = Space.fromDelegation(proof)
//       spaces.set(space.did(), space.meta)
//     }
//   }

//   // Find any other spaces the user may have access to
//   for (const delegation of ours) {
//     // TODO: we need a more robust way to determine which spaces a user has access to
//     // it may or may not involve look at delegations
//     const allows = ucanto.Delegation.allows(delegation)
//     for (const [resource, value] of Object.entries(allows)) {
//       // If we discovered a delegation to any DID, we add it to the spaces list.
//       if (resource.startsWith('did:key') && Object.keys(value).length > 0) {
//         if (!spaces.has(resource)) {
//           spaces.set(resource, {})
//         }
//       }
//     }
//   }

//   for (const [did, meta] of spaces) {
//     await data.addSpace(did, meta)
//   }
// }

/**
 * Stores given delegations in the agent's data store and adds discovered spaces
 * to the agent's space list.
 *
 * @param {Agent<{}>} agent
 * @param {object} authorization
 * @param {API.Delegation[]} authorization.proofs
 * @returns {Promise<API.Result<API.Unit, Error>>}
 */
export const importAuthorization = async (agent, { proofs }) => {
  try {
    await addProofs(agent.data, proofs)
    await addSpacesFromDelegations(agent, proofs)
    return { ok: {} }
  } catch (error) {
    return /** @type {{error:Error}} */ ({ error })
  }
}

// /**
//  * Get all the proofs matching the capabilities.
//  *
//  * Proofs are delegations with an audience matching agent DID, or with an
//  * audience matching the session DID.
//  *
//  * Attestations will also be included in the returned proofs require them.
//  *
//  * @param {object} agent
//  * @param {AgentData} agent.data
//  * @param {API.Principal} agent.issuer
//  * @param {API.CapabilityQuery[]} caps - Capabilities to filter by. Empty or undefined caps with return all the proofs.
//  * @param {object} [options]
//  * @param {API.UTCUnixTimestamp} [options.time] - Time when the capability should be valid
//  * @param {API.DID} [options.sessionProofIssuer] - only include session proofs for this issuer
//  */
// export const selectAuthorization = ({ data, issuer }, caps, options) => {
//   const authorizations = []
//   for (const { delegation } of selectProofs(data, caps, options)) {
//     if (delegation.audience.did() === issuer.did()) {
//       authorizations.push(delegation)
//     }
//   }

//   // now let's add any session proofs that refer to those authorizations
//   const sessions = getAttestations(data, options)
//   for (const proof of authorizations) {
//     const proofsByIssuer = sessions[proof.asCID.toString()] ?? {}
//     const sessionProofs = options?.sessionProofIssuer
//       ? proofsByIssuer[options.sessionProofIssuer] ?? []
//       : Object.values(proofsByIssuer).flat()
//     if (sessionProofs.length) {
//       authorizations.push(...sessionProofs)
//     }
//   }

//   return authorizations
// }

// /**
//  * Query the delegations store for all the delegations matching the capabilities provided.
//  *
//  * @param {AgentData} store
//  * @param {API.CapabilityQuery[]} caps
//  * @param {object} [options]
//  * @param {API.UTCUnixTimestamp} [options.time]
//  */
// export const selectProofs = (store, caps, { time } = {}) => {
//   const _caps = new Set(caps)
//   /** @type {Array<{ delegation: API.Delegation, meta: API.DelegationMeta }>} */
//   const values = []
//   for (const [, value] of store.delegations) {
//     // check expiration
//     if (!time || isValid(value.delegation, time)) {
//       // check if we need to filter for caps
//       if (Array.isArray(caps) && caps.length > 0) {
//         for (const cap of _caps) {
//           if (canDelegateCapability(value.delegation, cap)) {
//             values.push(value)
//           }
//         }
//       } else {
//         values.push(value)
//       }
//     }
//   }

//   return values
// }

// /**
//  * Get delegations created by the agent for others and their metadata.
//  *
//  * @param {AgentData} data
//  * @param {API.CapabilityQuery[]} caps - Capabilities to filter by. Empty or undefined caps with return all the delegations.
//  */
// export const selectIssuedDelegationsWithMeta = (data, caps) => {
//   const arr = []

//   for (const value of selectProofs(data, caps)) {
//     const { delegation } = value
//     const isAttestation = delegation.capabilities.some(
//       (c) => c.can === attest.can
//     )

//     if (!isAttestation && delegation.audience.did() !== data.principal.did()) {
//       arr.push(value)
//     }
//   }

//   return arr
// }

// /**
//  * Get delegations created by the agent for others.
//  *
//  * @param {AgentData} data
//  * @param {API.CapabilityQuery[]} caps - Capabilities to filter by. Empty or undefined caps with return all the delegations.
//  */
// export const selectIssuedDelegations = (data, caps) => {
//   const arr = []

//   for (const { delegation } of selectIssuedDelegationsWithMeta(data, caps)) {
//     arr.push(delegation)
//   }

//   return arr
// }

// /**
//  * Add a proof to the agent store.
//  *
//  * @param {AgentData} data
//  * @param {API.Delegation} delegation
//  */
// export const addProof = async (data, delegation) => {
//   return await addProofs(data, [delegation])
// }

/**
 * Adds set of proofs to the agent store.
 *
 * @param {AgentData} data
 * @param {Iterable<API.Delegation>} delegations
 */
export const addProofs = async (data, delegations) => {
  for (const proof of delegations) {
    await data.addDelegation(proof, { audience: data.meta })
  }

  await removeExpiredDelegations(data, { time: Date.now() / 1000 })

  return {}
}

/**
 * Clean up any expired delegations.
 *
 * @param {AgentData} data
 * @param {object} options
 * @param {API.UTCUnixTimestamp} options.time
 */
export const removeExpiredDelegations = async (data, options) => {
  for (const [, value] of data.delegations) {
    if (isExpired(value.delegation, options.time)) {
      await data.removeDelegation(value.delegation.cid)
    }
  }
}

// /**
//  * Get current space DID, proofs and abilities
//  *
//  * @param {object} agent
//  * @param {AgentData} agent.data
//  * @param {API.Principal} agent.issuer
//  */
// export const currentSpaceWithMeta = ({ data, issuer }) => {
//   const space = data.currentSpace
//   if (!space) {
//     return
//   }

//   const proofs = selectAuthorization({ data, issuer }, [
//     {
//       can: 'space/info',
//       with: space,
//     },
//   ])

//   const abilities = new Set()
//   for (const { capabilities } of proofs) {
//     for (const { can } of capabilities) {
//       abilities.add(can)
//     }
//   }

//   return {
//     did: data.currentSpace,
//     proofs: proofs,
//     capabilities: [...abilities],
//     meta: data.spaces.get(space),
//   }
// }

// /**
//  * @param {object} agent
//  * @param {AgentData} agent.data
//  * @param {API.Signer} agent.issuer
//  * @param {API.DelegateOptions} options
//  */
// export const issueDelegation = async ({ data, issuer }, options) => {
//   const time = Date.now() / 1000
//   const space = currentSpaceWithMeta({ data, issuer })
//   if (!space) {
//     throw new Error('no space selected.')
//   }

//   const capabilities = /** @type {API.Capabilities} */ (
//     options.abilities.map((can) => {
//       return {
//         with: space.did,
//         can,
//       }
//     })
//   )

//   // Verify agent can provide proofs for each requested capability
//   for (const capability of capabilities) {
//     if (!selectAuthorization({ data, issuer }, [capability], { time }).length) {
//       throw new Error(
//         `cannot delegate capability ${capability.can} with ${capability.with}`
//       )
//     }
//   }

//   const delegation = await Delegation.delegate({
//     issuer,
//     capabilities,
//     proofs: selectAuthorization({ data, issuer }, capabilities, { time }),
//     facts: [{ space: space.meta ?? {} }],
//     ...options,
//   })

//   await data.addDelegation(delegation, {
//     audience: options.audienceMeta,
//   })
//   await removeExpiredDelegations(data, { time })

//   return delegation
// }

/**
 * Creates an invocation for the given capability with Agent's proofs, service, issuer and space.
 *
 * @example
 * ```js
 * const spaceList = await Agent.issueInvocation(agent, Store.list, {
 *   nb: {
 *     size: 10,
 *   },
 * })
 *
 * await spaceList.execute(agent.connection)
 * ```
 *
 * @template {API.Ability} A
 * @template {API.URI} R
 * @template {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>} CAP
 * @template {API.Caveats} [C={}]
 *
 * @param {object} agent
 * @param {AgentData} agent.data
 * @param {API.Signer} agent.issuer
 * @param {{id: API.Principal}} agent.connection
 * @param {CAP} cap
 * @param {API.InvokeOptions<A, R, CAP>} options
 */
export const issueInvocation = async (
  { connection, issuer, data },
  cap,
  options
) => {
  const audience = options.audience || connection.id
  const time = Date.now() / 1000

  const space = options.with || data.currentSpace
  if (!space) {
    throw new Error('No space or resource selected, you need pass a resource.')
  }

  const proofs = [
    ...(options.proofs || []),
    ...selectAuthorization(
      { data, issuer },
      [
        {
          with: space,
          can: cap.can,
        },
      ],
      { sessionProofIssuer: audience.did(), time }
    ),
  ]

  if (proofs.length === 0 && options.with !== issuer.did()) {
    throw new Error(
      `no proofs available for resource ${space} and ability ${cap.can}`
    )
  }

  const inv = invoke({
    ...options,
    issuer,
    audience,
    // @ts-ignore
    capability: cap.create({
      with: space,
      nb: options.nb,
    }),
    proofs: [...proofs],
  })

  return /** @type {API.IssuedInvocationView<API.InferInvokedCapability<CAP>>} */ (
    inv
  )
}

// /**
//  * Returns iterable of all the proofs that contain capabilities matching
//  * passed query.
//  *
//  * @param {AgentData} store
//  * @param {object} query
//  * @param {API.CapabilityParser} [query.capability] - Capability to match
//  * @param {API.UTCUnixTimestamp} [query.time] - Time when the capability should be valid
//  * @param {API.DID} [query.audience] - Audience of the capability
//  */
// export const selectAccess = function* (store, { capability, audience, time }) {
//   for (const [, { delegation }] of store.delegations) {
//     // Skip if delegated to a different audience
//     if (audience && delegation.audience.did() !== audience) {
//       continue
//     }

//     // Skip if not valid at the given time
//     if (time && !isValid(delegation, time)) {
//       continue
//     }

//     // If proof matches the capability, yield it otherwise skip
//     const proof = capability ? matchProof(delegation, capability) : delegation
//     if (proof) {
//       yield proof
//     }
//   }
// }

// /**
//  * Select all attestations matching the given query.
//  *
//  * @param {AgentData} store
//  * @param {object} query
//  * @param {API.UCANLink[]} query.proofs
//  * @param {API.DID} [query.audience] - Audience of the capability
//  */
// const selectAttestations = (store, { proofs, audience }) => {
//   const proof = proofs
//     .map((proof) => Schema.link(proof))
//     .reduce((left, right) => Schema.or(left, right))

//   const selector = capability({
//     can: UCAN.attest.can,
//     with: Schema.did(),
//     nb: Schema.struct({ proof }),
//   })

//   return selectAccess(store, { capability: selector, audience })
// }

// /**
//  *
//  * @param {API.Delegation} delegation
//  * @param {API.CapabilityParser} query
//  */

// const matchProof = (delegation, query) => {
//   for (const capability of delegation.capabilities) {
//     const result = query.match(
//       /** @type {API.Source} */ ({ capability, delegation })
//     )
//     if (result.ok) {
//       return delegation
//     }
//   }
// }
// /**
//  * Invoke and execute the given capability on the Access service connection
//  *
//  * ```js
//  *
//  * await Agent.invokeAndExecute(agent, Store.list, {
//  *   nb: {
//  *     size: 10,
//  *   },
//  * })
//  * ```
//  *
//  * @deprecated - use following instead
//  * ```js
//  * const task = await Agent.issueInvocation(agent, cap, opts)
//  * await task.execute(connection) instead
//  * ```
//  *
//  * @template {API.Ability} A
//  * @template {API.URI} R
//  * @template {API.Caveats} C
//  * @template {Record<string, any>} Protocol
//  * @param {object} agent
//  * @param {AgentData} agent.data
//  * @param {API.Signer} agent.issuer
//  * @param {API.ConnectionView<Protocol>} agent.connection
//  * @param {API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>} cap
//  * @param {API.InvokeOptions<A, R, API.TheCapabilityParser<API.CapabilityMatch<A, R, C>>>} options
//  * @returns {Promise<API.InferReceipt<API.Capability<A, R, C>, Protocol>>}
//  */
// export const invokeAndExecute = async (agent, cap, options) => {
//   const invocation = await issueInvocation(agent, cap, options)
//   const out = invocation.execute(/** @type {*} */ (agent.connection))
//   return /** @type {*} */ (out)
// }
