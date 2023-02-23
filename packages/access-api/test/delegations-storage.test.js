import { context } from './helpers/context.js'
import { DbDelegationsStorage } from '../src/models/delegations.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'

describe('DbDelegationsStorage', () => {
  it('should persist delegations', async () => {
    const { d1 } = await context()
    const storage = new DbDelegationsStorage(createD1Database(d1))
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await storage.putMany(...delegations)
    assert.deepEqual(await storage.count(), delegations.length)
  })

  it('can retrieve delegations by audience', async () => {
    const { issuer, d1 } = await context()
    const alice = await principal.ed25519.generate()
    const bob = await principal.ed25519.generate()
    const delegations = new DbDelegationsStorage(createD1Database(d1))
    const delegationA = await createDelegation({ issuer, audience: alice })
    const delegationB = await createDelegation({ issuer, audience: bob })
    await delegations.putMany(delegationA, delegationB)

    const aliceDelegations = await delegations.find({ audience: alice.did() })
    assert.deepEqual(aliceDelegations.length, 1)
    const bobDelegations = await delegations.find({ audience: bob.did() })
    assert.deepEqual(bobDelegations.length, 1)
  })
})

/**
 * @param {object} [opts]
 * @param {Ucanto.Signer<Ucanto.DID>} [opts.issuer]
 * @param {Ucanto.Principal} [opts.audience]
 * @param {Ucanto.Capabilities} [opts.capabilities]
 * @returns {Promise<Ucanto.Delegation>}
 */
async function createDelegation(opts = {}) {
  const {
    issuer = await principal.ed25519.generate(),
    audience = issuer,
    capabilities = [
      {
        can: 'test/*',
        with: issuer.did(),
      },
    ],
  } = opts
  return await ucanto.delegate({
    issuer,
    audience,
    capabilities,
  })
}
