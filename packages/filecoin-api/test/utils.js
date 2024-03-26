import { Aggregate, Piece } from '@web3-storage/data-segment'
import { CID } from 'multiformats'
import { webcrypto } from 'one-webcrypto'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@ucanto/transport/car'
import * as raw from 'multiformats/codecs/raw'
import { CarWriter } from '@ipld/car'
import { Blob } from '@web-std/blob'

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

  return Object.assign(blob, { cid, roots: [root], bytes })
}

/**
 * @param {number} length
 * @param {number} size
 */
export async function randomCARs(length, size) {
  return (
    await Promise.all(Array.from({ length }).map(() => randomCAR(size)))
  ).map((car) => ({
    link: car.cid,
    size: car.size,
  }))
}

/**
 * @param {number} length
 * @param {number} size
 */
export async function randomCargo(length, size) {
  const cars = await Promise.all(
    Array.from({ length }).map(() => randomCAR(size))
  )

  return cars.map((car) => {
    const piece = Piece.fromPayload(car.bytes)

    return {
      link: piece.link,
      height: piece.height,
      root: piece.root,
      content: car.cid,
      padding: piece.padding,
      bytes: car.bytes,
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
