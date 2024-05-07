import { Aggregate, Piece } from '@web3-storage/data-segment'
import { CID } from 'multiformats'
import { webcrypto } from 'one-webcrypto'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'

/** @param {number} size */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    webcrypto.getRandomValues(chunk)

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
  return { cid, bytes }
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
      content: blob.cid,
      padding: piece.padding,
      bytes: blob.bytes,
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

export const validateAuthorization = () => ({ ok: {} })
