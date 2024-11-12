import * as DID from '@ipld/dag-ucan/did'
import * as Account from './account.js'
import * as Space from './space.js'
import { getClient } from './lib.js'
import * as ucanto from '@ucanto/core'
import { base64url } from 'multiformats/bases/base64'
import cryptoRandomString from 'crypto-random-string'

export { Account, Space }

/**
 * @typedef {object} BridgeGenerateTokensOptions
 * @property {string} resource
 * @property {string[]|string} [can]
 * @property {number} [expiration]
 * @property {boolean} [json]
 *
 * @param {string} resource
 * @param {BridgeGenerateTokensOptions} options
 */
export const generateTokens = async (
  resource,
  { can = ['store/add', 'upload/add'], expiration, json }
) => {
  const client = await getClient()

  const resourceDID = DID.parse(resource)
  const abilities = can ? [can].flat() : []
  if (!abilities.length) {
    console.error('Error: missing capabilities for delegation')
    process.exit(1)
  }

  const capabilities = /** @type {ucanto.API.Capabilities} */ (
    abilities.map((can) => ({ can, with: resourceDID.did() }))
  )

  const password = cryptoRandomString({ length: 32 })

  const coupon = await client.coupon.issue({
    capabilities,
    expiration: expiration === 0 ? Infinity : expiration,
    password,
  })

  const { ok: bytes, error } = await coupon.archive()
  if (!bytes) {
    console.error(error)
    return process.exit(1)
  }
  const xAuthSecret = base64url.encode(new TextEncoder().encode(password))
  const authorization = base64url.encode(bytes)

  if (json) {
    console.log(
      JSON.stringify({
        'X-Auth-Secret': xAuthSecret,
        Authorization: authorization,
      })
    )
  } else {
    console.log(`
X-Auth-Secret header: ${xAuthSecret}  

Authorization header: ${authorization}
    `)
  }
}
