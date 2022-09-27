import { CarBufferWriter, CarReader } from '@ipld/car'
import { Authority } from '@ucanto/authority'
import * as API from '@ucanto/interface'
import { Delegation, URI, capability } from '@ucanto/server'

/**
 * @param {API.Delegation<[
 *   API.Capability<"store/add", `did:${string}`>,
 *   API.Capability<"store/list", `did:${string}`>,
 *   API.Capability<"store/remove", `did:${string}`>,
 * ]>} delegation
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
 *   did: API.DID,
 *   issuer: API.SigningPrincipal
 * }} opts
 * @returns {Promise<Uint8Array>}
 */
export async function createDelegation(opts) {
  const delegatedTo = Authority.parse(opts.did)
  const storeAllDelegated = await Delegation.delegate({
    issuer: opts.issuer,
    audience: delegatedTo,
    capabilities: [
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
    ],
    expiration: Date.now() + 60000,
  })

  return writeDelegationUCANtoCar(storeAllDelegated)
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
