import { ok, error, Failure } from '@ucanto/core'
import { Invocation, Delegation } from '@ucanto/core'
import { base58btc } from 'multiformats/bases/base58'

/**
 * @typedef {{
 *   id: import('@ucanto/interface').Signer,
 *   connection: import('@ucanto/interface').Connection<import('../../src/types/blob.js').BlobService>
 * }} StorageProvider
 */

/** @type {Map<string, import('@ipld/dag-ucan').Principal>} */
const stickySelect = new Map()

/**
 * @param {import('@ucanto/interface').Signer} serviceID
 * @param {Array<StorageProvider>} storageProviders
 */
export const create = (serviceID, storageProviders) => 
  /** @type {import('../../src/types/blob.js').RoutingService} */
  ({
    selectStorageProvider: async (digest) => {
      // ensure we pick the same provider for a given digest within a test
      const key = base58btc.encode(digest.bytes)
      let provider = stickySelect.get(key)
      if (provider && !storageProviders.some(p => p.id.did() === provider?.did())) {
        provider = undefined
      }
      if (!provider) {
        provider = storageProviders[getRandomInt(storageProviders.length)].id
        stickySelect.set(key, provider)
      }
      return ok(provider)
    },
    configureInvocation: async (provider, capability, options) => {
      const prov = storageProviders.find(p => p.id.did() === provider.did())
      if (!prov) {
        return error(new ProofUnavailableError(`unknown provider: ${provider.did()}`))
      }

      const proof = await Delegation.delegate({
        issuer: prov.id,
        audience: serviceID,
        capabilities: [capability],
        expiration: Infinity,
      })

      const invocation = Invocation.invoke({
        ...options,
        issuer: serviceID,
        audience: provider,
        capability,
        proofs: [proof],
      })
      return ok({ invocation, connection: prov.connection })
    }
  })

/** @param {number} max */
const getRandomInt = max => Math.floor(Math.random() * max)

export class ProofUnavailableError extends Failure {
  static name = 'ProofUnavailable'

  get name() {
    return ProofUnavailableError.name
  }

  /** @param {string} [reason] */
  constructor (reason) {
    super()
    this.reason = reason
  }

  describe() {
    return this.reason ?? 'proof unavailable'
  }
}
