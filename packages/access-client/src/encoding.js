/**
 * Encoding utilities
 *
 * It is recommended that you import directly with:
 * ```js
 * import * as Encoding from '@web3-storage/access/encoding'
 *
 * // or
 *
 * import { encodeDelegations } from '@web3-storage/access/encoding'
 * ```
 *
 * @module
 */
/* eslint-disable unicorn/prefer-spread */
import { CarBufferReader } from '@ipld/car/buffer-reader'
import * as CarBufferWriter from '@ipld/car/buffer-writer'
import { Delegation } from '@ucanto/core/delegation'
import * as u8 from 'uint8arrays'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

/**
 * Encode delegations as bytes
 *
 * @param {Types.Delegation[]} delegations
 */
export function delegationsToBytes(delegations) {
  if (!Array.isArray(delegations) || delegations.length === 0) {
    throw new Error('Delegations required to be an non empty array.')
  }

  const roots = delegations.map(
    (d) => /** @type {CarBufferWriter.CID} */ (d.root.cid)
  )
  const cids = new Set()
  /** @type {CarBufferWriter.Block[]} */
  const blocks = []
  let byteLength = 0

  for (const delegation of delegations) {
    for (const block of delegation.export()) {
      const cid = block.cid.toV1().toString()
      if (!cids.has(cid)) {
        byteLength += CarBufferWriter.blockLength(
          /** @type {CarBufferWriter.Block} */ (block)
        )
        blocks.push(/** @type {CarBufferWriter.Block} */ (block))
        cids.add(cid)
      }
    }
  }
  const headerLength = CarBufferWriter.estimateHeaderLength(roots.length)
  const writer = CarBufferWriter.createWriter(
    new ArrayBuffer(headerLength + byteLength),
    { roots }
  )
  for (const block of blocks) {
    writer.write(block)
  }

  return writer.close()
}

/**
 * Decode bytes into Delegations
 *
 * @template {Types.Capabilities} [T=Types.Capabilities]
 * @param {import('./types').BytesDelegation<T>} bytes
 */
export function bytesToDelegations(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new TypeError('Input should be a non-empty Uint8Array.')
  }
  const reader = CarBufferReader.fromBytes(bytes)
  const roots = reader.getRoots()

  /** @type {Types.Delegation<T>[]} */
  const delegations = []

  for (const root of roots) {
    const rootBlock = reader.get(root)

    if (rootBlock) {
      const blocks = new Map()
      for (const block of reader.blocks()) {
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

/**
 * @param {Types.Delegation[]} delegations
 * @param {import('uint8arrays/to-string').SupportedEncodings} encoding
 */
export function delegationsToString(delegations, encoding = 'base64url') {
  const bytes = delegationsToBytes(delegations)

  return u8.toString(bytes, encoding)
}

/**
 * Encode one {@link Types.Delegation Delegation} into a string
 *
 * @param {Types.Delegation<Types.Capabilities>} delegation
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export function delegationToString(delegation, encoding) {
  return delegationsToString([delegation], encoding)
}

/**
 * Decode string into {@link Types.Delegation Delegation}
 *
 * @template {Types.Capabilities} [T=Types.Capabilities]
 * @param {import('./types').EncodedDelegation<T>} raw
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export function stringToDelegations(raw, encoding = 'base64url') {
  const bytes = u8.fromString(raw, encoding)

  return bytesToDelegations(bytes)
}

/**
 * Decode string into a {@link Types.Delegation Delegation}
 *
 * @template {Types.Capabilities} [T=Types.Capabilities]
 * @param {import('./types').EncodedDelegation<T>} raw
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export function stringToDelegation(raw, encoding) {
  const delegations = stringToDelegations(raw, encoding)

  return /** @type {Types.Delegation<T>} */ (delegations[0])
}

/**
 * @param {number} [expiration]
 */
export function expirationToDate(expiration) {
  const expires =
    expiration === Infinity || !expiration
      ? undefined
      : new Date(expiration * 1000)

  return expires
}
