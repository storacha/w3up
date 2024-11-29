import {
  uploadFile,
  uploadDirectory,
  uploadCAR,
  Receipt,
} from '@web3-storage/upload-client'
import {
  Access as AccessCapabilities,
  Blob as BlobCapabilities,
  Index as IndexCapabilities,
  Upload as UploadCapabilities,
  Filecoin as FilecoinCapabilities,
  Space as SpaceCapabilities,
} from '@web3-storage/capabilities'
import * as DIDMailto from '@web3-storage/did-mailto'
import { Base } from './base.js'
import * as Account from './account.js'
import { Space } from './space.js'
import { AgentDelegation } from './delegation.js'
import { BlobClient } from './capability/blob.js'
import { IndexClient } from './capability/index.js'
import { StoreClient } from './capability/store.js'
import { UploadClient } from './capability/upload.js'
import { SpaceClient } from './capability/space.js'
import { SubscriptionClient } from './capability/subscription.js'
import { UsageClient } from './capability/usage.js'
import { AccessClient } from './capability/access.js'
import { PlanClient } from './capability/plan.js'
import { FilecoinClient } from './capability/filecoin.js'
import { CouponAPI } from './coupon.js'
export * as Access from './capability/access.js'
import * as Result from './result.js'
import { remove } from '@web3-storage/capabilities/store'

export {
  AccessClient,
  BlobClient,
  FilecoinClient,
  IndexClient,
  PlanClient,
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
   * @param {URL} [options.receiptsEndpoint]
   */
  constructor(agentData, options) {
    super(agentData, options)
    this.capability = {
      access: new AccessClient(agentData, options),
      filecoin: new FilecoinClient(agentData, options),
      index: new IndexClient(agentData, options),
      plan: new PlanClient(agentData, options),
      space: new SpaceClient(agentData, options),
      blob: new BlobClient(agentData, options),
      store: new StoreClient(agentData, options),
      subscription: new SubscriptionClient(agentData, options),
      upload: new UploadClient(agentData, options),
      usage: new UsageClient(agentData, options),
    }
    this.coupon = new CouponAPI(agentData, options)
  }

  did() {
    return this._agent.did()
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
   * @param {Account.EmailAddress} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async login(email, options = {}) {
    const account = Result.unwrap(await Account.login(this, email, options))
    Result.unwrap(await account.save())
    return account
  }
  /* c8 ignore stop */

  /**
   * List all accounts that agent has stored access to.
   *
   * @returns {Record<DIDMailto, Account>} A dictionary with `did:mailto` as keys and `Account` instances as values.
   */
  accounts() {
    return Account.list(this)
  }

  /**
   * Uploads a file to the service and returns the root data CID for the
   * generated DAG.
   *
   * Required delegated capabilities:
   * - `filecoin/offer`
   * - `space/blob/add`
   * - `space/index/add`
   * - `upload/add`
   *
   * @param {import('./types.js').BlobLike} file - File data.
   * @param {import('./types.js').UploadFileOptions} [options]
   */
  async uploadFile(file, options = {}) {
    const conf = await this._invocationConfig([
      BlobCapabilities.add.can,
      IndexCapabilities.add.can,
      FilecoinCapabilities.offer.can,
      UploadCapabilities.add.can,
    ])
    options = {
      receiptsEndpoint: this._receiptsEndpoint.toString(),
      connection: this._serviceConf.upload,
      ...options,
    }
    return uploadFile(conf, file, options)
  }

  /**
   * Uploads a directory of files to the service and returns the root data CID
   * for the generated DAG. All files are added to a container directory, with
   * paths in the file names preserved.
   *
   * Required delegated capabilities:
   * - `filecoin/offer`
   * - `space/blob/add`
   * - `space/index/add`
   * - `upload/add`
   *
   * @param {import('./types.js').FileLike[]} files - File data.
   * @param {import('./types.js').UploadDirectoryOptions} [options]
   */
  async uploadDirectory(files, options = {}) {
    const conf = await this._invocationConfig([
      BlobCapabilities.add.can,
      IndexCapabilities.add.can,
      FilecoinCapabilities.offer.can,
      UploadCapabilities.add.can,
    ])
    options = {
      receiptsEndpoint: this._receiptsEndpoint.toString(),
      connection: this._serviceConf.upload,
      ...options,
    }
    return uploadDirectory(conf, files, options)
  }

  /**
   * Uploads a CAR file to the service.
   *
   * The difference between this function and `capability.blob.add` is that
   * the CAR file is automatically sharded, an index is generated, uploaded and
   * registered (see `capability.index.add`) and finally an an "upload" is
   * registered, linking the individual shards (see `capability.upload.add`).
   *
   * Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.
   *
   * Required delegated capabilities:
   * - `filecoin/offer`
   * - `space/blob/add`
   * - `space/index/add`
   * - `upload/add`
   *
   * @param {import('./types.js').BlobLike} car - CAR file.
   * @param {import('./types.js').UploadOptions} [options]
   */
  async uploadCAR(car, options = {}) {
    const conf = await this._invocationConfig([
      BlobCapabilities.add.can,
      IndexCapabilities.add.can,
      FilecoinCapabilities.offer.can,
      UploadCapabilities.add.can,
    ])
    options = {
      receiptsEndpoint: this._receiptsEndpoint.toString(),
      connection: this._serviceConf.upload,
      ...options,
    }
    return uploadCAR(conf, car, options)
  }

  /**
   * Get a receipt for an executed task by its CID.
   *
   * @param {import('multiformats').UnknownLink} taskCid
   */
  async getReceipt(taskCid) {
    const receiptsEndpoint = new URL(this._receiptsEndpoint).toString()
    return Receipt.poll(taskCid, { receiptsEndpoint })
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
    const agent = this._agent
    const id = agent.currentSpace()
    if (!id) return
    const meta = agent.spaces.get(id)
    return new Space({ id, meta, agent })
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
    return [...this._agent.spaces].map(([id, meta]) => {
      // @ts-expect-error id is not did:key
      return new Space({ id, meta, agent: this._agent })
    })
  }

  /**
   * Create a new space with a given name.
   * If an account is not provided, the space is created without any delegation and is not saved, hence it is a temporary space.
   * When an account is provided in the options argument, then it creates a delegated recovery account
   * by provisioning the space, saving it and then delegating access to the recovery account.
   * In addition, it authorizes the listed Content Serve Services to serve content from the created space.
   * It is done by delegating the `space/content/serve/*` capability to the Content Serve Service.
   * User can skip the Content Serve authorization by setting the `skipContentServeAuthorization` option to `true`.
   *
   * @typedef {object} SpaceCreateOptions
   * @property {boolean} [skipContentServeAuthorization] - Whether to skip the Content Serve authorization. It means that the content of the space will not be served by any Content Serve Service.
   * @property {`did:${string}:${string}`[]} [authorizeContentServeServices] - The DID Key or DID Web of the Content Serve Service to authorize to serve content from the created space.
   * @property {import('./types.js').ConnectionView<import('./types.js').ContentServeService>} [authorizeContentServeServices.connection] - The connection to the Content Serve Service that will handle, validate, and store the access/delegate UCAN invocation.
   * @property {Account.Account} [account] - The account configured as the recovery account for the space.
   * @property {string} [name] - The name of the space to create.
   *
   * @param {string} name - The name of the space to create.
   * @param {SpaceCreateOptions} options - Options for the space creation.
   * @returns {Promise<import("./space.js").OwnedSpace>} The created space owned by the agent.
   */
  async createSpace(name, options) {
    const space = await this._agent.createSpace(name)

    // Save the space to authorize the client to use the space
    await space.save()

    const account = options.account
    if (account) {
      // Provision the account with the space
      const provisionResult = await account.provision(space.did())
      if (provisionResult.error) {
        throw new Error(
          `failed to provision account: ${provisionResult.error.message}`,
          { cause: provisionResult.error }
        )
      }

      // Create a recovery for the account
      const recovery = await space.createRecovery(account.did())

      // Delegate space access to the recovery
      const result = await this.capability.access.delegate({
        space: space.did(),
        delegations: [recovery],
      })

      if (result.error) {
        throw new Error(
          `failed to authorize recovery account: ${result.error.message}`,
          { cause: result.error }
        )
      }
    }

    // Authorize the listed Content Serve Services to serve content from the created space
    if (options.skipContentServeAuthorization !== true) {
      if (
        !options.authorizeContentServeServices ||
        options.authorizeContentServeServices.length === 0
      ) {
        throw new Error(
          'failed to authorize Content Serve Services: missing <authorizeContentServeServices> option'
        )
      }

      if (!options.connection) {
        throw new Error(
          'failed to authorize Content Serve Services: missing <connection> option'
        )
      }

      for (const service of options.authorizeContentServeServices) {
        await this.authorizeContentServe(space, {
          audience: service,
          connection: options.connection,
        })
      }
    }

    return space
  }

  /**
   * Authorizes an audience to serve content from the provided space and record egress events.
   * It also publishes the delegation to the content serve service.
   * Delegates the following capabilities to the audience:
   * - `space/content/serve/*`
   *
   * @param {import('./types.js').OwnedSpace} space - The space to authorize the audience for.
   * @param {object} options - Options for the authorization.
   * @param {`did:${string}:${string}`} options.audience - The Web DID of the audience (gateway or peer) to authorize.
   * @param {import('./types.js').ConnectionView<import('./types.js').ContentServeService>} options.connection - The connection to the Content Serve Service that will handle, validate, and store the access/delegate UCAN invocation.
   * @param {number} [options.expiration] - The time at which the delegation expires in seconds from unix epoch.
   */
  async authorizeContentServe(space, options) {
    const currentSpace = this.currentSpace()
    try {
      // Set the current space to the space we are authorizing the gateway for
      await this.setCurrentSpace(space.did())

      /** @type {import('@ucanto/client').Principal<`did:${string}:${string}`>} */
      const audience = {
        did: () => options.audience,
      }

      // Create the delegation
      const delegation = await this.createDelegation(
        audience,
        [SpaceCapabilities.contentServe.can],
        {
          expiration: options.expiration ?? Infinity,
        }
      )

      // Publish the delegation to the content serve service
      const verificationResult = await AccessCapabilities.delegate
        .invoke({
          issuer: this._agent.issuer,
          audience,
          with: space.did(),
          proofs: [delegation],
          nb: {
            delegations: {
              [delegation.cid.toString()]: delegation.cid,
            },
          },
        })
        .execute(options.connection)

      if (verificationResult.out.error) {
        throw new Error(
          `failed to publish delegation for audience ${options.audience}: ${verificationResult.out.error.message}`,
          {
            cause: verificationResult.out.error,
          }
        )
      }

      return { ok: { ...verificationResult.out.ok, delegation } }
    } finally {
      if (currentSpace) {
        await this.setCurrentSpace(currentSpace.did())
      }
    }
  }

  /**
   * Share an existing space with another Storacha account via email address delegation.
   * Delegates access to the space to the specified email account with the following permissions:
   * - space/* - for managing space metadata
   * - blob/* - for managing blobs
   * - store/* - for managing stores
   * - upload/*- for registering uploads
   * - access/* - for re-delegating access to other devices
   * - filecoin/* - for submitting to the filecoin pipeline
   * - usage/* - for querying usage
   * The default expiration is set to infinity.
   *
   * @typedef {object} ShareOptions
   * @property {import('./types.js').ServiceAbility[]} abilities - Abilities to delegate to the delegate account.
   * @property {number} expiration - Expiration time in seconds.
   
   * @param {import("./types.js").EmailAddress} delegateEmail - Email of the account to share the space with.
   * @param {import('./types.js').SpaceDID} spaceDID - The DID of the space to share.
   * @param {ShareOptions} [options] - Options for the delegation.
   *
   * @returns {Promise<import('./delegation.js').AgentDelegation<any>>} Resolves with the AgentDelegation instance once the space is successfully shared.
   * @throws {Error} - Throws an error if there is an issue delegating access to the space.
   */
  async shareSpace(
    delegateEmail,
    spaceDID,
    options = {
      abilities: [
        'space/*',
        'store/*',
        'upload/*',
        'access/*',
        'usage/*',
        'filecoin/offer',
        'filecoin/info',
        'filecoin/accept',
        'filecoin/submit',
      ],
      expiration: Infinity,
    }
  ) {
    const { abilities, ...restOptions } = options
    const currentSpace = this.agent.currentSpace()

    try {
      // Make sure the agent is using the shared space before delegating
      await this.agent.setCurrentSpace(spaceDID)

      // Delegate capabilities to the delegate account to access the **current space**
      const { root, blocks } = await this.agent.delegate({
        ...restOptions,
        abilities,
        audience: {
          did: () => DIDMailto.fromEmail(DIDMailto.email(delegateEmail)),
        },
        // @ts-expect-error audienceMeta is not defined in ShareOptions
        audienceMeta: options.audienceMeta ?? {},
      })

      const delegation = new AgentDelegation(root, blocks, {
        audience: delegateEmail,
      })

      const sharingResult = await this.capability.access.delegate({
        space: spaceDID,
        delegations: [delegation],
      })

      if (sharingResult.error) {
        throw new Error(
          `failed to share space with ${delegateEmail}: ${sharingResult.error.message}`,
          {
            cause: sharingResult.error,
          }
        )
      }

      return delegation
    } finally {
      // Reset to the original space if it was different
      if (currentSpace && currentSpace !== spaceDID) {
        await this.agent.setCurrentSpace(currentSpace)
      }
    }
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
   * @param {import('./types.js').ServiceAbility[]} abilities
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

  /**
   * Removes association of a content CID with the space. Optionally, also removes
   * association of CAR shards with space.
   *
   * ⚠️ If `shards` option is `true` all shards will be deleted even if there is another upload(s) that
   * reference same shards, which in turn could corrupt those uploads.
   *
   * Required delegated capabilities:
   * - `space/blob/remove`
   * - `store/remove`
   * - `upload/get`
   * - `upload/remove`
   *
   * @param {import('multiformats').UnknownLink} contentCID
   * @param {object} [options]
   * @param {boolean} [options.shards]
   */
  async remove(contentCID, options = {}) {
    // Shortcut if there is no request to remove shards
    if (!options.shards) {
      // Remove association of content CID with selected space.
      await this.capability.upload.remove(contentCID)
      return
    }

    // Get shards associated with upload.
    const upload = await this.capability.upload.get(contentCID)

    // Remove shards
    if (upload.shards?.length) {
      await Promise.allSettled(
        upload.shards.map(async (shard) => {
          try {
            const res = await this.capability.blob.remove(shard.multihash)
            /* c8 ignore start */
            // if no size, the blob was not found, try delete from store
            if (res.ok && res.ok.size === 0) {
              await this.capability.store.remove(shard)
            }
          } catch (/** @type {any} */ error) {
            // If not found, we can tolerate error as it may be a consecutive call for deletion where first failed
            if (error?.cause?.name !== 'StoreItemNotFound') {
              throw new Error(`failed to remove shard: ${shard}`, {
                cause: error,
              })
            }
            /* c8 ignore next 4 */
          }
        })
      )
    }

    // Remove association of content CID with selected space.
    await this.capability.upload.remove(contentCID)
  }
}
