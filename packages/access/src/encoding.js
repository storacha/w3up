/* eslint-disable unicorn/prefer-spread */
import { CarReader } from '@ipld/car/reader'
import { CarWriter } from '@ipld/car/writer'
import { Delegation } from '@ucanto/core/delegation'
import * as u8 from 'uint8arrays'

/**
 * @param {AsyncIterable<Uint8Array>} iterable
 */
function collector(iterable) {
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
 * @param {import("@ucanto/interface").Delegation[]} delegations
 */
export async function encodeDelegations(delegations) {
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

  return u8.toString(bytes, 'base64')
}

/**
 * @param {string} raw
 */
export async function decodeDelegations(raw) {
  const bytes = u8.fromString(raw, 'base64')
  const reader = await CarReader.fromBytes(bytes)
  const roots = await reader.getRoots()

  const delegations = []

  for (const root of roots) {
    const rootBlock = await reader.get(root)

    if (rootBlock) {
      const blocks = new Map()
      for (const block of reader._blocks) {
        if (block.cid.toString() !== root.toString())
          blocks.set(block.cid.toString(), block)
      }

      // @ts-ignore
      delegations.push(new Delegation(rootBlock, blocks))
    } else {
      throw new Error('Failed to find root from raw delegation.')
    }
  }

  return delegations
}
