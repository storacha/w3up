import { CarBufferWriter, CarReader } from '@ipld/car'
import { Authority } from '@ucanto/authority'
import * as API from '@ucanto/interface'
import { Delegation, URI, capability } from '@ucanto/server'
import {
  identityIdentify,
  identityRegister,
  identityValidate,
} from '@web3-storage/access/capabilities'

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
 * }} opts
 * @param {boolean} [ includeAccountCaps ]
 * @returns {Promise<StoreDelegation>}
 */
export async function generateDelegation(opts, includeAccountCaps = false) {
  const delegatedTo = Authority.parse(opts.to)

  let capabilities = [
    {
      can: 'store/add',
      with: opts.issuer.did(),
    },
    {
      can: 'store/list',
      with: opts.issuer.did(),
    },
    {
      can: 'store/remove',
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

  const storeAllDelegated = await Delegation.delegate({
    issuer: opts.issuer,
    audience: delegatedTo,
    // @ts-ignore
    capabilities,
    expiration: Date.now() + 31_526_000,
    proofs: [],
  })

  return storeAllDelegated
}

/**
 * @async
 * @param {{
 *   to: API.DID,
 *   issuer: API.SigningPrincipal
 * }} opts
 * @returns {Promise<Uint8Array>}
 */
export async function writeDelegation(opts) {
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
