import { Aggregate, Piece } from '@web3-storage/data-segment'

import { toCAR } from './car.js'

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
export async function randomCAR(size) {
  const bytes = await randomBytes(size)
  return toCAR(bytes)
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
      padding: piece.padding,
      content: car.cid,
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
