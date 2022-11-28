// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { parseLink } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'

/**
 * @param {string} source
 */
export function parseCarLink(source) {
  return /** @type {Ucanto.Link<unknown, 514, number, 1>} */ (parseLink(source))
}

/**
 * @param {any} data
 */
export async function createCborCid(data) {
  const cbor = await CBOR.codec.write(data)
  return cbor.cid
}

/**
 * @param {string} source
 */
export async function createCarCid(source) {
  const cbor = await CBOR.codec.write({ hello: source })
  const shard = await CAR.codec.write({ roots: [cbor] })
  return shard.cid
}
