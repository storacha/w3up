import { Signer } from '@ucanto/principal'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import * as Ucanto from '@ucanto/interface'
import { CID } from 'multiformats'
import { UCAN } from '@web3-storage/capabilities'
import { isExpired, isValid } from './delegations.js'
import * as API from '../types.js'

/** @implements {API.AgentDataModel} */
export class AgentData {
  /** @type {(data: API.AgentDataExport) => Promise<void> | void} */
  #save

  /**
   * @param {API.AgentDataModel} data
   * @param {API.AgentDataOptions} [options]
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
   * @param {Partial<API.AgentDataModel>} [init]
   * @param {API.AgentDataOptions} [options]
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
   * @param {API.AgentDataExport} raw
   * @param {API.AgentDataOptions} [options]
   */
  static fromExport(raw, options) {
    /** @type {API.AgentDataModel['delegations']} */
    const dels = new Map()

    for (const [key, value] of raw.delegations) {
      dels.set(key, {
        delegation: importDAG(
          value.delegation.map((d) => ({
            cid: CID.parse(d.cid).toV1(),
            bytes: d.bytes,
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
    /** @type {API.AgentDataExport} */
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
          cid: `${b.cid}`,
          bytes: b.bytes,
        })),
      })
    }
    return raw
  }

  /**
   * @deprecated
   * @param {API.DID} did
   * @param {API.SpaceMeta} meta
   * @param {API.Delegation} [proof]
   */
  async addSpace(did, meta, proof) {
    this.spaces.set(did, meta)
    await (proof ? this.addDelegation(proof) : this.#save(this.export()))
  }

  /**
   * @deprecated
   * @param {API.DIDKey} did
   */
  async setCurrentSpace(did) {
    if (!this.spaces.has(did)) {
      throw new RangeError(`Agent has no proofs for ${did}.`)
    }
    this.currentSpace = did
    await this.#save(this.export())
  }

  /**
   * @param {API.Delegation} delegation
   * @param {API.DelegationMeta} [meta]
   */
  async addDelegation(delegation, meta) {
    this.delegations.set(`${delegation.cid}`, {
      delegation,
      meta: meta ?? {},
    })
    await this.#save(this.export())
  }

  /**
   * @param {API.UCANLink} cid
   */
  async removeDelegation(cid) {
    this.delegations.delete(`${cid}`)
    await this.#save(this.export())
  }
}

/**
 * Is the given capability a session attestation?
 *
 * @param {Ucanto.Capability} cap
 * @returns {boolean}
 */
const isAttestationCapability = (cap) => cap.can === UCAN.attest.can

/**
 * Is the given delegation an attestation ?
 *
 * @param {Ucanto.Delegation} delegation
 * @returns {delegation is Ucanto.Delegation<[API.UCANAttest]>}
 */
export const isAttestation = (delegation) =>
  delegation.capabilities.some((cap) => isAttestationCapability(cap))

/**
 * @typedef {string} SessionProofAuthorizationCid - the nb.proof CID of the ucan/attest in the session proof
 * @typedef {Ucanto.DID} SessionProofIssuer - issuer of ucan/attest session proof
 * @typedef {Record<SessionProofAuthorizationCid, Record<SessionProofIssuer, [Ucanto.Delegation, ...Ucanto.Delegation[]]>>} SessionProofIndexedByAuthorizationAndIssuer
 */

/**
 * Get a map from CIDs to their corresponding attestations.
 *
 * @param {AgentData} data
 * @param {object} [options]
 * @param {API.UTCUnixTimestamp} [options.time]
 * @returns {SessionProofIndexedByAuthorizationAndIssuer}
 */
export function getAttestations(data, { time } = {}) {
  /** @type {SessionProofIndexedByAuthorizationAndIssuer} */
  const proofs = {}
  for (const { delegation } of data.delegations.values()) {
    if (isAttestation(delegation)) {
      const cap = delegation.capabilities[0]
      if (cap && (!time || isValid(delegation, time))) {
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
