import { Signer } from '@ucanto/principal'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import { CID } from 'multiformats'

export const AgentData = {
  /**
   * @param {Partial<import('./types').AgentData>} [init]
   * @returns {Promise<import('./types').AgentData>}
   */
  async create (init = {}) {
    return {
      meta: {
        name: 'agent',
        // @ts-ignore
        type: 'device',
        ...init.meta
      },
      principal: init.principal ?? (await EdSigner.generate()),
      spaces: init.spaces ?? new Map(),
      delegations: init.delegations ?? new Map(),
      currentSpace: init.currentSpace,
    }
  },

  /**
   * @param {import('./types').AgentDataExport} raw
   * @returns {import('./types').AgentData}
   */
  from (raw) {
    /** @type {import('./types').AgentData['delegations']} */
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

    return {
      meta: raw.meta,
      // @ts-expect-error
      principal: Signer.from(raw.principal),
      currentSpace: raw.currentSpace,
      spaces: raw.spaces,
      delegations: dels,
    }
  },

  /**
   * @param {import('./types').AgentData} data
   * @returns {import('./types').AgentDataExport}
   */
  export (data) {
    const raw = {
      meta: data.meta,
      principal: data.principal.toArchive(),
      currentSpace: data.currentSpace,
      spaces: data.spaces,
      delegations: new Map(),
    }
    for (const [key, value] of data.delegations) {
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
}
