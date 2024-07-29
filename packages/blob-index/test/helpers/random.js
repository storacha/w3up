/* global crypto */
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@ucanto/transport/car'
import * as raw from 'multiformats/codecs/raw'
import { webcrypto } from '@storacha/one-webcrypto'

/** @param {number} size */
export async function randomBytes(size) {
  const bytes = new Uint8Array(size)
  while (size) {
    const chunk = new Uint8Array(Math.min(size, 65_536))
    webcrypto.getRandomValues(chunk)

    size -= chunk.length
    bytes.set(chunk, size)
  }
  return bytes
}

/** @param {number} size */
export async function randomCAR(size) {
  const bytes = await randomBytes(size)
  const hash = await sha256.digest(bytes)
  const root = CID.create(1, raw.code, hash)
  const carBytes = CAR.codec.encode({ roots: [{ cid: root, bytes }] })
  const blob = new Blob([carBytes])
  const cid = await CAR.codec.link(carBytes)
  return Object.assign(blob, { cid, roots: [root] })
}

// eslint-disable-next-line
export async function randomCID() {
  const bytes = await randomBytes(10)
  const hash = await sha256.digest(bytes)
  return CID.create(1, raw.code, hash)
}
