import * as API from '../../src/types.js'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { createSampleDelegation } from '../../src/utils/ucan.js'

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

/**
 * @type {API.Tests}
 */
export const test = {
  'should persist delegations': async (assert, context) => {
    const delegationsStorage = context.delegationsStorage
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await delegationsStorage.putMany(delegations)
    assert.deepEqual(
      await delegationsStorage.count(),
      BigInt(delegations.length)
    )
  },
  'can retrieve delegations by audience': async (assert, context) => {
    const delegations = await context.delegationsStorage
    const issuer = await principal.ed25519.generate()

    const alice = await principal.ed25519.generate()
    const delegationsForAlice = await Promise.all(
      Array.from({ length: 1 }).map(() =>
        createDelegation({ issuer, audience: alice })
      )
    )

    const bob = await principal.ed25519.generate()
    const delegationsForBob = await Promise.all(
      Array.from({ length: 2 }).map((e, i) =>
        createDelegation({
          issuer,
          audience: bob,
          capabilities: [
            {
              can: `test/${i}`,
              with: alice.did(),
            },
          ],
        })
      )
    )

    await delegations.putMany([...delegationsForAlice, ...delegationsForBob])

    const aliceDelegations = (await delegations.find({ audience: alice.did() }))
      .ok
    assert.deepEqual(aliceDelegations?.length, delegationsForAlice.length)

    const bobDelegations = (await delegations.find({ audience: bob.did() })).ok
    assert.deepEqual(bobDelegations?.length, delegationsForBob.length)

    const carol = await principal.ed25519.generate()
    const carolDelegations = (await delegations.find({ audience: carol.did() }))
      .ok
    assert.deepEqual(carolDelegations?.length, 0)
  },
  'can revoke delegations': async (assert, context) => {
    const storage = context.delegationsStorage
    const goodDelegation = await createSampleDelegation()
    const badDelegation = await createSampleDelegation()

    storage.putMany([goodDelegation, badDelegation])

    const { ok: goodDelegations } = await storage.find({ audience: /** @type {import('@ucanto/interface').DIDKey} */(goodDelegation.audience.did()) })
    assert.equal(goodDelegations?.length, 1)

    const { ok: badDelegations } = await storage.find({ audience: /** @type {import('@ucanto/interface').DIDKey} */(badDelegation.audience.did()) })
    assert.equal(badDelegations?.length, 1)

    const { ok: revoked } = await storage.areAnyRevoked([goodDelegation.cid, badDelegation.cid])
    assert.equal(revoked, false)

    await storage.revoke({ iss: 'did:key:z6mktrav', revoke: badDelegation.cid, challenge: '' })

    const { ok: goodDelegationsAfterRevoke } = await storage.find({ audience: /** @type {import('@ucanto/interface').DIDKey} */(goodDelegation.audience.did()) })
    assert.equal(goodDelegationsAfterRevoke?.length, 1)

    const { ok: badDelegationsAfterRevoke } = await storage.find({ audience: /** @type {import('@ucanto/interface').DIDKey} */(badDelegation.audience.did()) })
    assert.equal(badDelegationsAfterRevoke?.length, 0)

    const { ok: revokedAfterRevoke } = await storage.areAnyRevoked([goodDelegation.cid, badDelegation.cid])
    assert.equal(revokedAfterRevoke, true)
  }
}
