// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { parseLink, delegate } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/core/cbor'
import { Absentee } from '@ucanto/principal'

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
  const cbor = await CBOR.write(data)
  return cbor.cid
}

/**
 * @param {string} source
 */
export async function createCar(source) {
  const cbor = await CBOR.write({ hello: source })
  return await CAR.codec.write({ roots: [cbor] })
}

/**
 * @param {string} source
 */
export async function createCarCid(source) {
  const shard = await createCar(source)
  return shard.cid
}

/**
 * @param {object} input
 * @param {Ucanto.Signer} input.service
 * @param {Ucanto.Principal} input.agent
 * @param {Ucanto.DID} input.account
 */
export const createAuthorization = async ({ account, agent, service }) => {
  const delegation = await delegate({
    issuer: Absentee.from({ id: account }),
    audience: agent,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
  })

  const attestation = await delegate({
    issuer: service,
    audience: agent,
    capabilities: [
      {
        with: service.did(),
        can: 'ucan/attest',
        nb: { proof: delegation.cid },
      },
    ],
  })

  return [delegation, attestation]
}

export const validateAuthorization = () => ({ ok: {} })
