// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { parseLink } from '@ucanto/core'
import { codec as CARCodec } from '@ucanto/transport/car'
import { codec as CBOR } from '@ucanto/transport/cbor'

/**
 * @param {string} source
 */
export function parseCarLink(source) {
  return /** @type {Ucanto.Link<unknown, 514, number, 1>} */ (parseLink(source))
}

/**
 * @param {string} source
 */
export async function createCarCid(source) {
  const cbor = await CBOR.write({ hello: source })
  const shard = await CARCodec.write({ roots: [cbor] })
  return shard.cid
}
