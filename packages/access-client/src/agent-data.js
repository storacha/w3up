import { Signer } from '@ucanto/principal'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import { CID } from 'multiformats'

/** @typedef {import('./types').AgentDataModel} AgentDataModel */

/**
 * @implements {AgentDataModel}
 */
export class AgentData {
  /** @type {(data: import('./types').AgentDataExport) => Promise<void> | void} */
  #save

  /**
   * @param {import('./types').AgentDataModel} data
   * @param {import('./types').AgentDataOptions} [options]
   */
  constructor(data, options = {}) {
    this.meta = data.meta
    this.principal = data.principal
    this.spaces = data.spaces
    this.delegations = data.delegations
    this.currentSpace = data.currentSpace
    this.#save = options.store ? options.store.save : () => {}
  }

  /**
   * @param {Partial<import('./types').AgentDataModel>} [init]
   * @param {import('./types').AgentDataOptions} [options]
   */
  static async create(init = {}, options = {}) {
    const agentData = new AgentData(
      {
        meta: { name: 'agent', type: 'device', ...init.meta },
        principal: init.principal ?? (await EdSigner.generate()),
        spaces: init.spaces ?? new Map(),
        delegations: init.delegations ?? new Map(),
        currentSpace: init.currentSpace,
      },
      options
    )
    if (options.store) {
      await options.store.save(agentData.export())
    }
    return agentData
  }

  /**
   * Instantiate AgentData, backed by data persisted in the passed store.
   *
   * @param {import('./types').IStore<import('./types').AgentDataExport>} store
   * @param {import('./types').AgentDataOptions & { initialData?: Partial<import('./types').AgentDataModel> }} options
   */
  static async fromStore(store, options = {}) {
    await store.open()
    const storedData = await store.load() // { ... } or null/undefined
    return storedData
      ? AgentData.fromExport(storedData)
      : await AgentData.create(options.initialData, {
          store: {
            save: async (d) => {
              await store.save(d)
            },
          },
        })
  }

  /**
   * @param {import('./types').AgentDataExport} raw
   * @param {import('./types').AgentDataOptions} [options]
   */
  static fromExport(raw, options) {
    /** @type {import('./types').AgentDataModel['delegations']} */
    const dels = new Map()

    for (const [key, value] of raw.delegations) {
      dels.set(key, {
        delegation: importDAG(
          value.delegation.map((d) => ({
            cid: CID.parse(d.cid),
            bytes: d.bytes,
          }))
        ),
        meta: value.meta,
      })
    }

    return new AgentData(
      {
        meta: raw.meta,
        // @ts-expect-error
        principal: Signer.from(raw.principal),
        currentSpace: raw.currentSpace,
        spaces: raw.spaces,
        delegations: dels,
      },
      options
    )
  }

  export() {
    /** @type {import('./types').AgentDataExport} */
    const raw = {
      meta: this.meta,
      principal: this.principal.toArchive(),
      currentSpace: this.currentSpace,
      spaces: this.spaces,
      delegations: new Map(),
    }
    for (const [key, value] of this.delegations) {
      raw.delegations.set(key, {
        meta: value.meta,
        delegation: [...value.delegation.export()].map((b) => ({
          cid: b.cid.toString(),
          bytes: b.bytes,
        })),
      })
    }
    return raw
  }

  /**
   * @param {import('@ucanto/interface').DID} did
   * @param {import('./types').SpaceMeta} meta
   * @param {import('@ucanto/interface').Delegation} [proof]
   */
  async addSpace(did, meta, proof) {
    this.spaces.set(did, meta)
    await (proof ? this.addDelegation(proof) : this.#save(this.export()));
  }

  /**
   * @param {import('@ucanto/interface').DID} did
   */
  async setCurrentSpace(did) {
    this.currentSpace = did
    await this.#save(this.export())
  }

  /**
   * @param {import('@ucanto/interface').Delegation} delegation
   * @param {import('./types').DelegationMeta} [meta]
   */
  async addDelegation(delegation, meta) {
    this.delegations.set(delegation.cid.toString(), {
      delegation,
      ...(meta ? { meta } : {}),
    })
    await this.#save(this.export())
  }

  /**
   * @param {import('@ucanto/interface').UCANLink} cid
   */
  async removeDelegation(cid) {
    this.delegations.delete(cid.toString())
    await this.#save(this.export())
  }
}
