import * as API from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import { Delegation } from '@ucanto/server'
import { codec as CAR } from '@ucanto/transport/car'

/**
 * @typedef {{ roots: [API.UCANBlock], blocks: Map<string, API.Block> }} DelegationArchive
 * @param {API.Delegation} delegation
 * @return {Promise<API.ByteView<DelegationArchive>>}
 */
export const exportDelegation = async (delegation) => {
  const { root } = delegation
  /** @type {Map<string, API.Block>} */
  const blocks = new Map()
  for (const block of delegation.export()) {
    blocks.set(block.cid.toString(), block)
  }
  return CAR.encode({ roots: [root], blocks })
}

/**
 * @param {API.ByteView<DelegationArchive>} bytes
 * @returns {Promise<API.Delegation>}
 */
export const importDelegation = async (bytes) => {
  const { roots, blocks } = await CAR.decode(bytes)
  const [root] = roots

  // @ts-expect-error - typedefs missmatch but this is actually accurate
  return Delegation.create({ root, blocks })
}

/**
 * @async
 * @param {{
 *   to: API.DID,
 *   issuer: API.SigningPrincipal
 *   expiration?: number
 * }} opts
 * @param {boolean} [ includeAccountCaps ]
 */
export async function generateDelegation(opts, includeAccountCaps = false) {
  const delegatedTo = Principal.parse(opts.to)

  let capabilities = [
    {
      can: 'store/*',
      with: opts.issuer.did(),
    },
    {
      can: 'upload/*',
      with: opts.issuer.did(),
    },
  ]

  if (includeAccountCaps) {
    capabilities = capabilities.concat([
      {
        can: 'identity/identify',
        with: opts.issuer.did(),
      },
      {
        can: 'identity/validate',
        with: opts.issuer.did(),
      },
      {
        can: 'identity/register',
        with: opts.issuer.did(),
      },
    ])
  }

  const offset = opts?.expiration || 31_516_000

  const storeAllDelegated = await Delegation.delegate({
    issuer: opts.issuer,
    audience: delegatedTo,
    // @ts-ignore
    capabilities,
    expiration: Date.now() + offset,
  })

  return storeAllDelegated
}

/**
 * @async
 * @param {{
 *   to: API.DID,
 *   issuer: API.SigningPrincipal
 *   expiration?: number
 * }} opts
 * @returns {Promise<Uint8Array>}
 */
export async function buildDelegationCar(opts) {
  return exportDelegation(await generateDelegation(opts))
}
