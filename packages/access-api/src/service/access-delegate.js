import * as Server from '@ucanto/server'
import { delegate } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { createDelegationsStorage } from './delegations.js'

/**
 * access/delegate failure due to the 'with' resource not having
 * enough storage capacity to store the delegation.
 * https://github.com/web3-storage/specs/blob/7e662a2d9ada4e3fc22a7a68f84871bff0a5380c/w3-access.md?plain=1#L94
 *
 * Semantics inspired by https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/507
 *
 * @typedef {import('@web3-storage/capabilities/types').InsufficientStorage} InsufficientStorage
 */

/**
 * @typedef {import('@web3-storage/capabilities/types').AccessDelegateSuccess} AccessDelegateSuccess
 * @typedef {import('@web3-storage/capabilities/types').AccessDelegateFailure} AccessDelegateFailure
 * @typedef {Ucanto.Result<AccessDelegateSuccess, AccessDelegateFailure>} AccessDelegateResult
 */

/**
 * @param {object} ctx
 * @param {import('../types/delegations').DelegationsStorage} ctx.delegations
 * @param {HasStorageProvider} ctx.hasStorageProvider
 */
export function accessDelegateProvider(ctx) {
  const handleInvocation = createAccessDelegateHandler(ctx)
  return Server.provide(delegate, async ({ capability, invocation }) => {
    return handleInvocation(
      /** @type {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessDelegate>} */ (
        invocation
      )
    )
  })
}

/**
 * @callback AccessDelegateHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessDelegate>} invocation
 * @returns {Promise<AccessDelegateResult>}
 */

/**
 * @callback HasStorageProvider
 * @param {Ucanto.DID<'key'>} did
 * @returns {Promise<boolean>} whether the given resource has a storage provider
 */

/**
 * @param {object} options
 * @param {import('../types/delegations').DelegationsStorage} [options.delegations]
 * @param {HasStorageProvider} [options.hasStorageProvider]
 * @param {boolean} [options.allowServiceWithoutStorageProvider] - whether to allow service if the capability resource does not have a storage provider
 * @returns {AccessDelegateHandler}
 */
export function createAccessDelegateHandler({
  delegations = createDelegationsStorage(),
  hasStorageProvider = async () => false,
  allowServiceWithoutStorageProvider = false,
} = {}) {
  return async (invocation) => {
    const capabability = invocation.capabilities[0]
    if (
      !allowServiceWithoutStorageProvider &&
      !(await hasStorageProvider(capabability.with))
    ) {
      return {
        name: 'InsufficientStorage',
        message: `${capabability.with} has no storage provider`,
        error: true,
      }
    }
    const delegated = extractProvenDelegations(invocation)
    await delegations.putMany(...delegated)
    return {}
  }
}

/**
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessDelegate>} invocation
 * @returns {Iterable<Ucanto.Delegation<Ucanto.Capabilities>>}
 */
function* extractProvenDelegations({ proofs, capabilities }) {
  const nbDelegations = new Set(Object.values(capabilities[0].nb.delegations))
  const proofDelegations = proofs.flatMap((proof) =>
    'capabilities' in proof ? [proof] : []
  )
  if (nbDelegations.size > proofDelegations.length) {
    throw new Error(
      `UnknownDelegation: nb.delegations has more delegations than proofs`
    )
  }
  for (const delegationLink of nbDelegations) {
    // @todo avoid O(m*n) check here, but not obvious how while also using full Link#equals logic
    // (could be O(minimum(m,n)) if comparing CID as strings, but that might ignore same link diff multibase)
    const delegationProof = proofDelegations.find((p) =>
      delegationLink.equals(p.cid)
    )
    if (!delegationProof) {
      throw new Error(
        `UnknownDelegation: missing proof for delegation cid ${delegationLink}`
      )
    }
    yield delegationProof
  }
}
