import {
  uploadFile,
  uploadDirectory,
  uploadCAR,
} from '@web3-storage/upload-client'
import {
  Store as StoreCapabilities,
  Upload as UploadCapabilities,
} from '@web3-storage/capabilities'
import { Base } from './base.js'
import * as Account from './account.js'
import { Space } from './space.js'
import { Delegation as AgentDelegation } from './delegation.js'
import { StoreClient } from './capability/store.js'
import { UploadClient } from './capability/upload.js'
import { SpaceClient } from './capability/space.js'
import { SubscriptionClient } from './capability/subscription.js'
import { UsageClient } from './capability/usage.js'
import { AccessClient } from './capability/access.js'
import { FilecoinClient } from './capability/filecoin.js'
export * as Access from './capability/access.js'

export {
  AccessClient,
  FilecoinClient,
  StoreClient,
  SpaceClient,
  SubscriptionClient,
  UploadClient,
  UsageClient,
}

export class Client extends Base {
  /**
   * @param {import('@web3-storage/access').AgentData} agentData
   * @param {object} [options]
   * @param {import('./types.js').ServiceConf} [options.serviceConf]
   */
  constructor(agentData, options) {
    super(agentData, options)
    this.capability = {
      access: new AccessClient(agentData, options),
      filecoin: new FilecoinClient(agentData, options),
      space: new SpaceClient(agentData, options),
      store: new StoreClient(agentData, options),
      subscription: new SubscriptionClient(agentData, options),
      upload: new UploadClient(agentData, options),
      usage: new UsageClient(agentData, options),
    }
  }

  did() {
    return this._agent.did()
  }

  /* c8 ignore start - testing websockets is hard */
  /**
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
  /* c8 ignore stop */

  /**
   * List all accounts that agent has stored access to. Returns a dictionary
   * of accounts keyed by their `did:mailto` identifier.
   */
  accounts() {
    return Account.list(this)
  }

  /**
   * Uploads a file to the service and returns the root data CID for the
   * generated DAG.
   *
   * @param {import('./types.js').BlobLike} file - File data.
   * @param {import('./types.js').UploadOptions} [options]
   */
  async uploadFile(file, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])
    options.connection = this._serviceConf.upload
    return uploadFile(conf, file, options)
  }

  /**
   * Uploads a directory of files to the service and returns the root data CID
   * for the generated DAG. All files are added to a container directory, with
   * paths in file names preserved.
   *
   * @param {import('./types.js').FileLike[]} files - File data.
   * @param {import('./types.js').UploadDirectoryOptions} [options]
   */
  async uploadDirectory(files, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])
    options.connection = this._serviceConf.upload
    return uploadDirectory(conf, files, options)
  }

  /**
   * Uploads a CAR file to the service.
   *
   * The difference between this function and `capability.store.add` is that the
   * CAR file is automatically sharded and an "upload" is registered, linking
   * the individual shards (see `capability.upload.add`).
   *
   * Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.
   *
   * @param {import('./types.js').BlobLike} car - CAR file.
   * @param {import('./types.js').UploadOptions} [options]
   */
  async uploadCAR(car, options = {}) {
    const conf = await this._invocationConfig([
      StoreCapabilities.add.can,
      UploadCapabilities.add.can,
    ])
    options.connection = this._serviceConf.upload
    return uploadCAR(conf, car, options)
  }

  /**
   * Return the default provider.
   */
  defaultProvider() {
    return this._agent.connection.id.did()
  }

  /**
   * The current space.
   */
  currentSpace() {
    const did = this._agent.currentSpace()
    return did ? new Space(did, this._agent.spaces.get(did)) : undefined
  }

  /**
   * Use a specific space.
   *
   * @param {import('./types.js').DID} did
   */
  async setCurrentSpace(did) {
    await this._agent.setCurrentSpace(/** @type {`did:key:${string}`} */ (did))
  }

  /**
   * Spaces available to this agent.
   */
  spaces() {
    return [...this._agent.spaces].map(([did, meta]) => {
      return new Space(did, meta)
    })
  }

  /**
   * Create a new space with a given name.
   *
   * @param {string} name
   */
  async createSpace(name) {
    return await this._agent.createSpace(name)
  }
  /* c8 ignore stop */

  /**
   * Add a space from a received proof.
   *
   * @param {import('./types.js').Delegation} proof
   */
  async addSpace(proof) {
    return await this._agent.importSpaceFromDelegation(proof)
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
    return this._agent.proofs(caps)
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
   * @param {import('./types.js').Capability[]} [caps] - Capabilities to
   * filter by. Empty or undefined caps with return all the delegations.
   */
  delegations(caps) {
    const delegations = []
    for (const { delegation, meta } of this._agent.delegationsWithMeta(caps)) {
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
    const { root, blocks } = await this._agent.delegate({
      ...options,
      abilities,
      audience,
      audienceMeta,
    })
    return new AgentDelegation(root, blocks, { audience: audienceMeta })
  }

  /**
   * Get receipts from executed task. Optionally follow tasks effects if already available.
   *
   * @param {import('@ucanto/interface').UnknownLink} taskCid
   * @param {object} [options]
   * @param {boolean} [options.follow]
   */
  async getTaskReceipts(taskCid, options = {}) {
    return this._agent.getTaskReceipts(taskCid, options)
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
