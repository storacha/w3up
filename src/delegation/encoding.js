import { CarReader } from '@ipld/car/reader'
import { CarWriter } from '@ipld/car/writer'
import { Delegation } from '@ucanto/core/delegation'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import * as u8 from 'uint8arrays'

/**
 * @param {AsyncIterable<Uint8Array>} iterable
 */
function collector (iterable) {
  const chunks = []
  const cfn = (async () => {
    for await (const chunk of iterable) {
      chunks.push(chunk)
    }
    return u8.concat(chunks)
  })()
  return cfn
}

/**
 * @param {Types.Delegation[]} delegations
 * @param {import('uint8arrays/to-string').SupportedEncodings} encoding
 */
export async function encodeDelegations (delegations, encoding = 'base64url') {
  if (delegations.length === 0) {
    return ''
  }

  const roots = delegations.map((d) => d.root.cid)

  // @ts-ignore
  const { writer, out } = CarWriter.create(roots)
  const collection = collector(out)

  for (const delegation of delegations) {
    for (const block of delegation.export()) {
      // @ts-ignore
      await writer.put(block)
    }
  }
  await writer.close()

  const bytes = await collection

  return u8.toString(bytes, encoding)
}

/**
 * Encode one {@link Types.Delegation Delegation} into a string
 *
 * @param {Types.Delegation<Types.Capabilities>} delegation
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export function delegationToString (delegation, encoding) {
  return encodeDelegations([delegation], encoding)
}

/**
 * Decode string into {@link Types.Delegation Delegation}
 *
 * @template {Types.Capabilities} [T=Types.Capabilities]
 * @param {import('../types').EncodedDelegation<T>} raw
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export async function decodeDelegations (raw, encoding = 'base64url') {
  if (!raw) {
    return []
  }
  const bytes = u8.fromString(raw, encoding)
  const reader = await CarReader.fromBytes(bytes)
  const roots = await reader.getRoots()

  /** @type {Types.Delegation<T>[]} */
  const delegations = []

  for (const root of roots) {
    const rootBlock = await reader.get(root)

    if (rootBlock) {
      const blocks = new Map()
      for (const block of reader._blocks) {
        if (block.cid.toString() !== root.toString()) { blocks.set(block.cid.toString(), block) }
      }

      // @ts-ignore
      delegations.push(new Delegation(rootBlock, blocks))
    } else {
      throw new Error('Failed to find root from raw delegation.')
    }
  }

  return delegations
}

/**
 * Decode string into a {@link Types.Delegation Delegation}
 *
 * @template {Types.Capabilities} [T=Types.Capabilities]
 * @param {import('../types').EncodedDelegation<T>} raw
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export async function stringToDelegation (raw, encoding) {
  const delegations = await decodeDelegations(raw, encoding)

  return /** @type {Types.Delegation<T>} */ (delegations[0])
}
