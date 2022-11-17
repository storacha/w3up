import { CarWriter } from '@ipld/car'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@ucanto/transport/car'

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
    size -= bytes.length
    bytes.set(chunk, size)
  }
  return bytes
}

/** @param {number} size */
export async function randomCAR(size) {
  const bytes = await randomBytes(size)
  const hash = await sha256.digest(bytes)
  const root = CID.create(1, raw.code, hash)

  const { writer, out } = CarWriter.create(root)
  writer.put({ cid: root, bytes })
  writer.close()

  const chunks = []
  for await (const chunk of out) {
    chunks.push(chunk)
  }
  const blob = new Blob(chunks)
  const cid = await CAR.codec.link(new Uint8Array(await blob.arrayBuffer()))

  return Object.assign(blob, { cid, roots: [root] })
}
