import { Aggregate, Piece } from '@web3-storage/data-segment'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { CID } from 'multiformats'

/** @param {number} size */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    if (!globalThis.crypto) {
      try {
        const { webcrypto } = await import('node:crypto')
        webcrypto.getRandomValues(chunk)
      } catch (error) {
        throw new Error(
          'unknown environment - no global crypto and not Node.js',
          { cause: error }
        )
      }
    } else {
      crypto.getRandomValues(chunk)
    }
    size -= bytes.length
    bytes.set(chunk, size)
  }
  return bytes
}

/** @param {number} size */
export async function randomBlob(size) {
  const bytes = await randomBytes(size)
  const hash = await sha256.digest(bytes)
  const cid = CID.create(1, raw.code, hash)

  return {
    cid,
    bytes,
  }
}

/**
 * @param {number} length
 * @param {number} size
 */
export async function randomCargo(length, size) {
  const blobs = await Promise.all(
    Array.from({ length }).map(() => randomBlob(size))
  )

  return blobs.map((blob) => {
    const piece = Piece.fromPayload(blob.bytes)

    return {
      link: piece.link,
      height: piece.height,
      root: piece.root,
      padding: piece.padding,
      content: blob.cid,
    }
  })
}

/**
 * @param {number} length
 * @param {number} size
 */
export async function randomAggregate(length, size) {
  const pieces = await randomCargo(length, size)

  const aggregateBuild = Aggregate.build({
    pieces,
  })

  return {
    pieces,
    aggregate: aggregateBuild,
  }
}
