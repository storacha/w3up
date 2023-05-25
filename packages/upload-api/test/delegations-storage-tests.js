import * as assert from 'node:assert'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as Types from '../src/types.js'

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
 * @typedef {object} DelegationsStorageVariant
 * @property {Pick<import('../src/types/delegations.js').DelegationsStorage, 'putMany'|'count'|'find'>} delegations
 */

/**
 * @param {(context: unknown) => Promise<Types.DelegationsStorage>} createVariant - create a new test context
 * @param {(name: string, test: () => Promise<unknown>) => void} test - name a test
 */
export function testVariant(createVariant, test) {
  test('should persist delegations', async (/**@type {unknown} */ context) => {
    const delegationsStorage = await createVariant(context)
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await delegationsStorage.putMany(delegations[0].asCID, ...delegations)
    assert.deepEqual(await delegationsStorage.count(), delegations.length)
  })
  test('can retrieve delegations by audience', async (/**@type {unknown} */ context) => {
    const delegations = await createVariant(context)
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

    await delegations.putMany(delegationsForAlice[0].asCID, ...delegationsForAlice, ...delegationsForBob)

    const aliceDelegations = (await delegations.find({ audience: alice.did() })).ok
    assert.deepEqual(aliceDelegations?.length, delegationsForAlice.length)

    const bobDelegations = (await delegations.find({ audience: bob.did() })).ok
    assert.deepEqual(bobDelegations?.length, delegationsForBob.length)

    const carol = await principal.ed25519.generate()
    const carolDelegations = (await delegations.find({ audience: carol.did() })).ok
    assert.deepEqual(carolDelegations?.length, 0)
  })
}
