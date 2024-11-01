import { Signer } from '@ucanto/principal'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import * as Ucanto from '@ucanto/interface'
import { CID } from 'multiformats'
import { UCAN } from '@storacha/capabilities'
import { isExpired } from './delegations.js'
import { uint8ArrayToArrayBuffer } from './utils/buffers.js'

/** @typedef {import('./types.js').AgentDataModel} AgentDataModel */

/** @implements {AgentDataModel} */
export class AgentData {
  /** @type {(data: import('./types.js').AgentDataExport) => Promise<void> | void} */
  #save

  /**
   * @param {import('./types.js').AgentDataModel} data
   * @param {import('./types.js').AgentDataOptions} [options]
   */
  constructor(data, options = {}) {
    this.meta = data.meta
    this.principal = data.principal
    this.spaces = data.spaces
    this.delegations = data.delegations
    this.currentSpace = data.currentSpace
    this.#save = (data) =>
      options.store ? options.store.save(data) : undefined
  }

  /**
   * Create a new AgentData instance from the passed initialization data.
   *
   * @param {Partial<import('./types.js').AgentDataModel>} [init]
   * @param {import('./types.js').AgentDataOptions} [options]
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
   * Instantiate AgentData from previously exported data.
   *
   * @param {import('./types.js').AgentDataExport} raw
   * @param {import('./types.js').AgentDataOptions} [options]
   */
  static fromExport(raw, options) {
    /** @type {import('./types.js').AgentDataModel['delegations']} */
    const dels = new Map()

    for (const [key, value] of raw.delegations) {
      dels.set(key, {
        delegation: importDAG(
          value.delegation.map((d) => ({
            cid: CID.parse(d.cid).toV1(),
            bytes:
              d.bytes instanceof Uint8Array ? d.bytes : new Uint8Array(d.bytes),
          }))
        ),
        meta: value.meta,
      })
    }

    return new AgentData(
      {
        meta: raw.meta,
        // @ts-expect-error for some reason TS thinks this is a EdSigner
        principal: Signer.from(raw.principal),
        currentSpace: raw.currentSpace,
        spaces: raw.spaces,
        delegations: dels,
      },
      options
    )
  }

  /**
   * Export data in a format safe to pass to `structuredClone()`.
   */
  export() {
    /** @type {import('./types.js').AgentDataExport} */
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
          bytes: uint8ArrayToArrayBuffer(b.bytes),
        })),
      })
    }
    return raw
  }

  /**
   * @param {import('@ucanto/interface').DID} did
   * @param {import('./types.js').SpaceMeta} meta
   * @param {import('@ucanto/interface').Delegation} [proof]
   */
  async addSpace(did, meta, proof) {
    this.spaces.set(did, meta)
    await (proof ? this.addDelegation(proof) : this.#save(this.export()))
  }

  /**
   * @deprecated
   * @param {import('@ucanto/interface').DID<'key'>} did
   */
  async setCurrentSpace(did) {
    this.currentSpace = did
    await this.#save(this.export())
  }

  /**
   * @param {import('@ucanto/interface').Delegation} delegation
   * @param {import('./types.js').DelegationMeta} [meta]
   */
  async addDelegation(delegation, meta) {
    this.delegations.set(delegation.cid.toString(), {
      delegation,
      meta: meta ?? {},
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

/**
 * Is the given capability a session attestation?
 *
 * @param {Ucanto.Capability} cap
 * @returns {boolean}
 */
const isSessionCapability = (cap) => cap.can === UCAN.attest.can

/**
 * Is the given delegation a session proof?
 *
 * @param {Ucanto.Delegation} delegation
 * @returns {delegation is Ucanto.Delegation<[import('./types.js').UCANAttest]>}
 */
export const isSessionProof = (delegation) =>
  delegation.capabilities.some((cap) => isSessionCapability(cap))

/**
 * @typedef {string} SessionProofAuthorizationCid - the nb.proof CID of the ucan/attest in the session proof
 * @typedef {Ucanto.DID} SessionProofIssuer - issuer of ucan/attest session proof
 * @typedef {Record<SessionProofAuthorizationCid, Record<SessionProofIssuer, [Ucanto.Delegation, ...Ucanto.Delegation[]]>>} SessionProofIndexedByAuthorizationAndIssuer
 */

/**
 * Get a map from CIDs to the session proofs that reference them
 *
 * @param {AgentData} data
 * @returns {SessionProofIndexedByAuthorizationAndIssuer}
 */
export function getSessionProofs(data) {
  /** @type {SessionProofIndexedByAuthorizationAndIssuer} */
  const proofs = {}
  for (const { delegation } of data.delegations.values()) {
    if (isSessionProof(delegation)) {
      const cap = delegation.capabilities[0]
      if (cap && !isExpired(delegation)) {
        const proof = cap.nb.proof
        if (proof) {
          const proofCid = proof.toString()
          const issuerDid = delegation.issuer.did()
          proofs[proofCid] = proofs[proofCid] ?? {}
          proofs[proofCid][issuerDid] = proofs[proofCid][issuerDid] ?? []
          proofs[proofCid][issuerDid].push(delegation)
        }
      }
    }
  }
  return proofs
}
