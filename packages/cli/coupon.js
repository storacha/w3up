import fs from 'node:fs/promises'
import * as DID from '@ipld/dag-ucan/did'
import * as Account from './account.js'
import * as Space from './space.js'
import { getClient } from './lib.js'
import * as ucanto from '@ucanto/core'

export { Account, Space }

/**
 * @typedef {object} CouponIssueOptions
 * @property {string} customer
 * @property {string[]|string} [can]
 * @property {string} [password]
 * @property {number} [expiration]
 * @property {string} [output]
 *
 * @param {string} customer
 * @param {CouponIssueOptions} options
 */
export const issue = async (
  customer,
  { can = 'provider/add', expiration, password, output }
) => {
  const client = await getClient()

  const audience = DID.parse(customer)
  const abilities = can ? [can].flat() : []
  if (!abilities.length) {
    console.error('Error: missing capabilities for delegation')
    process.exit(1)
  }

  const capabilities = /** @type {ucanto.API.Capabilities} */ (
    abilities.map((can) => ({ can, with: audience.did() }))
  )

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

  if (output) {
    await fs.writeFile(output, bytes)
  } else {
    process.stdout.write(bytes)
  }
}
