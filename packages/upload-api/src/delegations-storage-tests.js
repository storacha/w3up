import * as assert from 'node:assert'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { collect } from 'streaming-iterables'
import { createSampleDelegation } from './utils/ucan.js'
import * as Types from './types.js'

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
 * @property {Pick<import('./types/delegations.js').DelegationsStorage, 'putMany'|'count'|'find'>} delegations
 */

/**
 * @param {() => Promise<Types.DelegationsStorage>} createVariant - create a new test context
 * @param {(name: string, test: () => Promise<unknown>) => void} test - name a test
 */
export function testVariant(createVariant, test) {
  test('should persist delegations', async () => {
    const delegationsStorage = await createVariant()
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await delegationsStorage.putMany(...delegations)
    assert.deepEqual(await delegationsStorage.count(), delegations.length)
  })
  test('can retrieve delegations by audience', async () => {
    const delegations = await createVariant()
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

    await delegations.putMany(...delegationsForAlice, ...delegationsForBob)

    const aliceDelegations = await collect(
      delegations.find({ audience: alice.did() })
    )
    assert.deepEqual(aliceDelegations.length, delegationsForAlice.length)

    const bobDelegations = await collect(
      delegations.find({ audience: bob.did() })
    )
    assert.deepEqual(bobDelegations.length, delegationsForBob.length)

    const carol = await principal.ed25519.generate()
    const carolDelegations = await collect(
      delegations.find({ audience: carol.did() })
    )
    assert.deepEqual(carolDelegations.length, 0)
  })
}
