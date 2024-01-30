import { CAR } from '@ucanto/transport'
import * as Account from './view/account.js'
import { Space as SpaceView } from './space.js'
import { Delegation as AgentDelegation } from './delegation.js'
import { StoreClient } from './client/store.js'
import { UploadClient } from './client/upload.js'
import { SpaceClient } from './client/space.js'
import { SubscriptionClient } from './client/subscription.js'
import { UsageClient } from './client/usage.js'
import { AccessClient } from './client/access.js'
import { FilecoinClient } from './client/filecoin.js'
import { CouponAPI } from './coupon.js'
import * as Agent from './agent.js'
export * as Access from './capability/access.js'
import * as Space from './capability/space.js'
import * as Result from './result.js'
import * as API from './types.js'
import * as Config from './service.js'

export {
  AccessClient,
  FilecoinClient,
  StoreClient,
  SpaceClient,
  SubscriptionClient,
  UploadClient,
  UsageClient,
}

export class Client {
  /**
   * @param {API.AgentData} data
   * @param {object} [options]
   * @param {API.ServiceConf} [options.serviceConf]
   * @param {URL} [options.receiptsEndpoint]
   */
  constructor(
    data,
    {
      serviceConf = Config.serviceConf,
      receiptsEndpoint = Config.receiptsEndpoint,
    } = {}
  ) {
    this.agents = {
      access: Agent.from({
        data,
        connection: serviceConf.access,
        receiptsEndpoint,
      }),
      upload: Agent.from({
        data,
        connection: serviceConf.upload,
        receiptsEndpoint,
      }),
      filecoin: Agent.from({
        data,
        connection: serviceConf.filecoin,
        receiptsEndpoint,
      }),
    }

    const upload = new UploadClient(this.agents.upload)
    this.data = data
    this._receiptsEndpoint = receiptsEndpoint
    this.capability = {
      access: new AccessClient(this.agents.access),
      filecoin: new FilecoinClient(this.agents.filecoin),
      space: new SpaceClient(this.agents.access),
      store: new StoreClient(this.agents.upload),
      upload,
      subscription: new SubscriptionClient(this.agents.upload),
      usage: new UsageClient(this.agents.upload),
    }
    this.coupon = new CouponAPI(this.agents.upload)

    this.uploadFile = upload.uploadFile.bind(upload)
    this.uploadDirectory = upload.uploadDirectory.bind(upload)
    this.uploadCAR = upload.uploadCAR.bind(upload)
  }

  get issuer() {
    return this.data.principal
  }

  did() {
    return this.data.principal.did()
  }

  /* c8 ignore start - testing websockets is hard */
  /**
   * @deprecated - Use client.login instead.
   *
   * Authorize the current agent to use capabilities granted to the passed
   * email account.
   *
   * @param {`${string}@${string}`} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {Iterable<{ can: import('./types.js').Ability }>} [options.capabilities]
   */
  async authorize(email, options) {
    await this.capability.access.authorize(email, options)
  }

  /**
   * @param {API.EmailAddress} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async login(email, options = {}) {
    const account = Result.unwrap(
      await Account.login(this.agents.access, email, options)
    )
    Result.unwrap(await account.save())
    return account
  }
  /* c8 ignore stop */

  /**
   * List all accounts that agent has stored access to. Returns a dictionary
   * of accounts keyed by their `did:mailto` identifier.
   */
  accounts() {
    return Account.list(this.agents.access)
  }

  /**
   * Get a receipt for an executed task by its CID.
   *
   * @param {import('multiformats').UnknownLink} taskCid
   */
  async getReceipt(taskCid) {
    // Fetch receipt from endpoint
    const workflowResponse = await fetch(
      new URL(taskCid.toString(), this._receiptsEndpoint)
    )
    /* c8 ignore start */
    if (!workflowResponse.ok) {
      throw new Error(
        `no receipt available for requested task ${taskCid.toString()}`
      )
    }
    /* c8 ignore stop */
    // Get receipt from Message Archive
    const agentMessageBytes = new Uint8Array(
      await workflowResponse.arrayBuffer()
    )
    // Decode message
    const agentMessage = await CAR.request.decode({
      body: agentMessageBytes,
      headers: {},
    })
    // Get receipt from the potential multiple receipts in the message
    return agentMessage.receipts.get(taskCid.toString())
  }

  /**
   * Return the default provider.
   */
  defaultProvider() {
    return this.agents.upload.connection.id.did()
  }

  /**
   * The current space.
   */
  currentSpace() {
    const id = this.data.currentSpace
    if (!id) return
    const meta = this.data.spaces.get(id)
    const proofs = Agent.selectAuthorization(this, [{ with: id }])

    return new SpaceView({ id, meta, agent: this.agents.upload })
  }

  /**
   * Use a specific space.
   *
   * @param {API.SpaceDID} did
   */
  async setCurrentSpace(did) {
    await this.data.setCurrentSpace(did)
  }

  /**
   * Spaces available to this agent.
   */
  spaces() {
    return [...this.data.spaces].map(([did, meta]) => {
      const id = /** @type {API.SpaceDID} */ (did)
      const proofs = Agent.selectAuthorization(this, [{ with: id }])
      return new SpaceView({ id, meta, agent: this.agents.upload })
    })
  }

  /**
   * Create a new space with a given name.
   *
   * @param {string} name
   */
  async createSpace(name) {
    return await Space.generate({ name, agent: this.agents.access })
  }

  /**
   * @param {string} secret
   * @param {object} options
   * @param {string} options.name
   */
  async recoverSpace(secret, { name }) {
    return await Space.fromMnemonic(secret, { name, agent: this.agents.access })
  }

  /* c8 ignore stop */

  /**
   * Add a space from a received proof.
   *
   * @param {API.Delegation} proof
   */
  async addSpace(proof) {
    const space = Space.fromDelegation(proof)

    // save space in agent's space store
    this.data.spaces.set(space.did(), { ...space.meta, name: space.name })
    // save the proof in the agent's delegation store
    await Agent.addProofs(this.data, space.proofs)

    // If we do not have a current space, make this one the current space
    if (!this.currentSpace()) {
      await this.data.setCurrentSpace(space.did())
    }

    return space
  }

  /**
   * Get all the proofs matching the capabilities.
   *
   * Proofs are delegations with an _audience_ matching the agent DID.
   *
   * @param {import('./types.js').Capability[]} [caps] - Capabilities to
   * filter by. Empty or undefined caps with return all the proofs.
   */
  proofs(caps) {
    return Agent.selectAuthorization(this, caps)
  }

  /**
   * Add a proof to the agent. Proofs are delegations with an _audience_
   * matching the agent DID.
   *
   * @param {import('./types.js').Delegation} proof
   */
  async addProof(proof) {
    await this._agent.addProof(proof)
  }

  /**
   * Get delegations created by the agent for others.
   *
   * @param {API.Capability[]} [caps] - Capabilities to
   * filter by. Empty or undefined caps with return all the delegations.
   */
  delegations(caps) {
    const delegations = []
    for (const { delegation, meta } of Agent.selectIssuedDelegationsWithMeta(
      this.data,
      caps
    )) {
      delegations.push(
        new AgentDelegation(delegation.root, delegation.blocks, meta)
      )
    }
    return delegations
  }

  /**
   * Create a delegation to the passed audience for the given abilities with
   * the _current_ space as the resource.
   *
   * @param {import('./types.js').Principal} audience
   * @param {import('./types.js').Abilities[]} abilities
   * @param {Omit<import('./types.js').UCANOptions, 'audience'> & { audienceMeta?: import('./types.js').AgentMeta }} [options]
   */
  async createDelegation(audience, abilities, options = {}) {
    const audienceMeta = options.audienceMeta ?? {
      name: 'agent',
      type: 'device',
    }
    const { root, blocks } = await Agent.issueDelegation(this, {
      ...options,
      abilities,
      audience,
      audienceMeta,
    })
    return new AgentDelegation(root, blocks, { audience: audienceMeta })
  }

  /**
   * Revoke a delegation by CID.
   *
   * If the delegation was issued by this agent (and therefore is stored in the
   * delegation store) you can just pass the CID. If not, or if the current agent's
   * delegation store no longer contains the delegation, you MUST pass a chain of
   * proofs that proves your authority to revoke this delegation as `options.proofs`.
   *
   * @param {import('@ucanto/interface').UCANLink} delegationCID
   * @param {object} [options]
   * @param {import('@ucanto/interface').Delegation[]} [options.proofs]
   */
  async revokeDelegation(delegationCID, options = {}) {
    return this._agent.revoke(delegationCID, {
      proofs: options.proofs,
    })
  }
}
