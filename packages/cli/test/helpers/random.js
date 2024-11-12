import { CarWriter } from '@ipld/car'
import * as CAR from '@ucanto/transport/car'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

/** @param {number} size */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    if (!globalThis.crypto) {
      try {
        const { webcrypto } = await import('node:crypto')
        webcrypto.getRandomValues(chunk)
      } catch (err) {
        throw new Error(
          'unknown environment - no global crypto and not Node.js',
          { cause: err }
        )
      }
    } else {
      crypto.getRandomValues(chunk)
    }
    size -= chunk.length
    bytes.set(chunk, size)
  }
  return bytes
}

/** @param {number} size */
export async function randomCAR(size) {
  const bytes = await randomBytes(size)
  return toCAR(bytes)
}

/** @param {Uint8Array} bytes */
export async function toBlock(bytes) {
  const hash = await sha256.digest(bytes)
  const cid = CID.createV1(raw.code, hash)
  return { cid, bytes }
}

/**
 * @param {Uint8Array} bytes
 */
export async function toCAR(bytes) {
  const block = await toBlock(bytes)
  const { writer, out } = CarWriter.create(block.cid)
  void writer.put(block)
  void writer.close()

  const chunks = []
  for await (const chunk of out) {
    chunks.push(chunk)
  }
  const blob = new Blob(chunks)
  const cid = await CAR.codec.link(new Uint8Array(await blob.arrayBuffer()))

  return Object.assign(blob, { cid, roots: [block.cid] })
}
