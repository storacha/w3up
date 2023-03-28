// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { parseLink } from '@ucanto/core'
import * as Server from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { service } from './fixtures.js'

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

/**
 * @param {object} handlers - a map of keys to capability handler maps
 * @returns {Ucanto.ServerView<import('../../src/types.js').Service>}
 */
export function createServer(handlers = {}) {
  const server = Server.create({
    id: service,
    encoder: CBOR,
    decoder: CAR,
    service: {
      space: {
        info: Server.provide(Space.info, async ({ capability }) => {
          return {
            did: 'did:key:sss',
            agent: 'did:key:agent',
            email: 'mail@mail.com',
            product: 'product:free',
            updated_at: 'sss',
            inserted_at: 'date',
          }
        }),
        recover: Server.provide(Space.recover, async ({ capability }) => {
          return {
            recover: true,
          }
        }),
      },
      ...handlers,
    },
  })

  // @ts-ignore
  return server
}
