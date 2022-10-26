import { CarBufferWriter, CarReader } from '@ipld/car'
import * as API from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import { Delegation } from '@ucanto/server'

/**
 * @typedef {API.Delegation<API.Capabilities>} StoreDelegation
 */

/**
 * @async
 * @param {StoreDelegation} delegation
 * @returns {Promise<Uint8Array>}
 */
async function writeDelegationUCANtoCar(delegation) {
  const carWriter = CarBufferWriter.createWriter(Buffer.alloc(1024))
  const delegationBlocks = delegation.export()

  for (const block of delegationBlocks) {
    carWriter.write(block)
    carWriter.addRoot(block.cid, { resize: true })
  }

  return carWriter.close({ resize: true })
}
/**
 * @async
 * @param {{
 *   to: API.DID,
 *   issuer: API.SigningPrincipal
 *   expiration?: number
 * }} opts
 * @param {boolean} [ includeAccountCaps ]
 * @returns {Promise<StoreDelegation>}
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
  return writeDelegationUCANtoCar(await generateDelegation(opts))
}

/**
 * @param {Uint8Array} bytes
 */
export async function importDelegation(bytes) {
  const reader = await CarReader.fromBytes(bytes)
  const roots = await reader.getRoots()

  const ucan = await reader.get(roots[0])
  // @ts-ignore
  const imported = Delegation.import([ucan])
  return imported
}
